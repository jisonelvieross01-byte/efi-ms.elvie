/* CircuitLab DC engine. Modified nodal analysis, partial-pivot Gaussian elimination.
   No shunt conductances or made-up readings: each conductive island has its own reference. */
(function(root){
'use strict';
function linear(A,b){
 const n=b.length; A=A.map((r,i)=>[...r,b[i]]);
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[p][k]))p=i;
  if(Math.abs(A[p][k])<1e-12)throw Error('An ideal-source loop has no unique solution. Remove a redundant source or meter loop.');
  [A[k],A[p]]=[A[p],A[k]];const q=A[k][k];for(let j=k;j<=n;j++)A[k][j]/=q;
  for(let i=0;i<n;i++)if(i!==k){const f=A[i][k];for(let j=k;j<=n;j++)A[i][j]-=f*A[k][j];}
 }return A.map(r=>r[n]);
}
function solve(circuit){
 const cs=circuit.components||[], wires=circuit.wires||[], messages=[];
 const ids=new Set(cs.map(c=>c.id)), parent=new Map();
 for(const c of cs)for(let t=0;t<2;t++)parent.set(c.id+':'+t,c.id+':'+t);
 const find=x=>{if(!parent.has(x))throw Error('A wire has a missing terminal.');if(parent.get(x)!==x)parent.set(x,find(parent.get(x)));return parent.get(x)};
 const join=(a,b)=>parent.set(find(a),find(b));
 try{
 for(const w of wires)join(w.a,w.b);
 for(const c of cs)if(c.type==='junction'||c.type==='wire')join(c.id+':0',c.id+':1');
 const nodes=[...new Set([...parent.keys()].map(find))], ends=c=>[find(c.id+':0'),find(c.id+':1')];
 const source=c=>['cell','battery','supply'].includes(c.type);
 const resist=c=>['resistor','variable','lamp','thermistor','ldr','fuse'].includes(c.type);
 const diodes=cs.filter(c=>['diode','led'].includes(c.type));
 if(diodes.length>10)return {ok:false,messages:['Use at most 10 diodes or LEDs in this classroom solver.'],readings:{}};
 for(const c of cs){if(source(c)&&(!Number.isFinite(+c.value)||+c.value<=0))throw Error('Set each source voltage above zero.');if(resist(c)&&(!Number.isFinite(+c.value)||+c.value<=0))throw Error('Resistance must be greater than zero.');}
 // Short detection treats ideal ammeters as wires, without hiding their measured branch currents.
 const sp=new Map(nodes.map(n=>[n,n]));const sf=n=>sp.get(n)===n?n:sf(sp.get(n));
 for(const c of cs)if(c.type==='ammeter'||c.type==='switch'&&c.closed){const [a,b]=ends(c);sp.set(sf(a),sf(b));}
 for(const c of cs)if(source(c)){const [a,b]=ends(c);if(sf(a)===sf(b))return {ok:false,short:true,readings:{},messages:['⚠ Short circuit! + and − are joined directly. Remove that wire or ammeter.']};}
 let solution=null;
 for(let mask=0;mask<2**diodes.length;mask++){
  const branches=[];
  for(const c of cs){const [a,b]=ends(c);if(source(c))branches.push({c,a,b,r:0,e:+c.value});
   else if(c.type==='ammeter'||c.type==='switch'&&c.closed)branches.push({c,a,b,r:0,e:0});
   else if(resist(c)&&!(c.type==='fuse'&&c.blown))branches.push({c,a,b,r:+c.value,e:0});
   else if(diodes.includes(c)&&mask&(1<<diodes.indexOf(c)))branches.push({c,a,b,r:1,e:c.type==='led'?1.8:0.7});
  }
  const adj=new Map(nodes.map(n=>[n,[]]));for(const b of branches){adj.get(b.a).push(b.b);adj.get(b.b).push(b.a);}
  const group=new Map(),refs=[];for(const n of nodes)if(!group.has(n)){const g=refs.length;refs.push(n);const stack=[n];group.set(n,g);while(stack.length){for(const m of adj.get(stack.pop()))if(!group.has(m)){group.set(m,g);stack.push(m);}}}
  const unknown=nodes.filter(n=>!refs.includes(n)),idx=new Map(unknown.map((n,i)=>[n,i]));
  const ideal=branches.filter(b=>b.r===0);const size=unknown.length+ideal.length;
  const A=Array.from({length:size},()=>Array(size).fill(0)),z=Array(size).fill(0);
  const stamp=(a,b,v)=>{if(a!==undefined&&b!==undefined)A[a][b]+=v};
  for(const b of branches){const i=idx.get(b.a),j=idx.get(b.b);
   if(b.r){const g=1/b.r;stamp(i,i,g);stamp(j,j,g);stamp(i,j,-g);stamp(j,i,-g);if(i!==undefined)z[i]+=g*b.e;if(j!==undefined)z[j]-=g*b.e;}
   else {const k=unknown.length+ideal.indexOf(b);stamp(i,k,1);stamp(j,k,-1);stamp(k,i,1);stamp(k,j,-1);z[k]=b.e;}
  }
  let x;try{x=linear(A,z)}catch(e){if(!diodes.length)throw e;continue;}
  const potential=n=>idx.has(n)?x[idx.get(n)]:0;
  let valid=true;for(let d=0;d<diodes.length;d++){const c=diodes[d],[a,b]=ends(c),v=potential(a)-potential(b),drop=c.type==='led'?1.8:0.7;
   if(group.get(a)!==group.get(b))continue;
   if(mask&(1<<d)){if(v<drop-1e-7)valid=false;}else if(v>drop+1e-7)valid=false;
  }if(valid){solution={branches,ideal,x,unknown,group,potential,ends};break;}
 }
 if(!solution)throw Error('No consistent diode operating state was found. Check source polarities and diode paths.');
 const {branches,ideal,x,unknown,group,potential}=solution,readings={};
 for(const c of cs){const [a,b]=ends(c),same=group.get(a)===group.get(b),br=branches.find(b=>b.c===c);
  const voltage=same?potential(a)-potential(b):null;
  let current=br?(br.r?(potential(a)-potential(b)-br.e)/br.r:x[unknown.length+ideal.indexOf(br)]):0;
  if(c.type==='wire'||c.type==='junction')current=null;
  readings[c.id]={voltage,current,power:voltage===null||current===null?null:voltage*current,connected:same};
  if(c.type==='voltmeter'&&!same)messages.push('Voltmeter: connect it across a part (in parallel).');
  const used=t=>wires.some(w=>w.a===c.id+':'+t||w.b===c.id+':'+t);
  if(!used(0)||!used(1))messages.push(c.type+': one end is not connected.');
  if(c.type==='fuse'&&Math.abs(current)>1)messages.push('⚠ Fuse is over 1 A. Open the switch.');
  if(c.type==='led'&&Math.abs(current)>.03)messages.push('⚠ LED over 30 mA. Add a resistor.');
 }
 for(const meter of cs.filter(c=>c.type==='ammeter')){const [a,b]=ends(meter);for(const load of cs.filter(resist)){const [u,v]=ends(load);if(a!==b&&(a===u&&b===v||a===v&&b===u))messages.push('Ammeter goes in series, not across a part.');}}
 const active=cs.some(c=>source(c)&&Math.abs(readings[c.id].current)>1e-8);
 if(!cs.some(source))messages.unshift('Add a battery or cell.');
 else if(!active)messages.unshift('No current. Is the loop open, a switch off, or a diode backwards?');
 else messages.unshift('✓ Current is flowing.');
 return {ok:true,active,readings,messages:[...new Set(messages)],nodes:Object.fromEntries([...parent.keys()].map(n=>[n,find(n)]))};
 }catch(e){return {ok:false,readings:{},messages:[e.message]};}
}
const api={solve,linear};if(typeof module!=='undefined')module.exports=api;else root.CircuitSolver=api;
})(typeof window==='undefined'?globalThis:window);
