'use strict';
let componentView='physical';
try{componentView=localStorage.getItem('circuitlab-view')==='symbols'?'symbols':'physical';}catch{}
const $=s=>document.querySelector(s), NS='http://www.w3.org/2000/svg';
let state={components:[],wires:[]},selected=null,armed=null,placing=null,tool='select',running=false,result=null,mode='missions',mission=0,detective=0,history=[],future=[],serial=0,drag=null,example='',sound=false;
let missionPassSignature='';
function missionSignature(){return mission+':'+JSON.stringify(state);}
function mayAdvanceMission(){return missionPhase==='complete'&&(mode==='missions'||mode==='challenge')&&missionPassSignature===missionSignature();}
let classroom={names:['Pair 1','Pair 2'],scores:[0,0],completed:[],awarded:[]},remaining=90,timerOn=false;
const missions=[
 ['Light a lamp','Join a battery and a lamp in a loop.','Charges need a complete path back to the source.','lamp'],
 ['Take control','Light a lamp with a closed switch.','A closed switch completes a path; an open switch interrupts it.','switch'],
 ['Read the current','Light a lamp. Add an ammeter in series.','An ammeter carries the same current as the lamp in series.','ammeter'],
 ['Measure voltage','Light a lamp. Add a voltmeter across it.','A parallel voltmeter compares the potential at both ends of the lamp.','voltmeter'],
 ['Share the voltage','6 V battery + two 100 Ω resistors in series.','Total resistance is 200 Ω. Current is 0.030 A; each resistor has 3 V.','series'],
 ['Make two paths','6 V battery + two 100 Ω resistors in parallel.','Each branch has 6 V and 0.060 A. The source supplies 0.120 A.','parallel'],
 ['Tune the current','Use a variable resistor. Set lamp current to 0.020–0.040 A.','Increasing series resistance reduces the current for a fixed source voltage.','variable'],
 ['Protect an LED','Light an LED (5–20 mA) with a resistor in series.','An LED needs correct polarity and a resistor to limit its current.','led'],
 ['Sense it','Lamp + LDR or thermistor in series.','A sensor changes resistance. That changes current in a series circuit.','sensor'],
 ['Bring it together','Lamp + switch + ammeter + voltmeter, all correct.','Current is measured in series; potential difference is measured in parallel.','all'],
 ['Check Ohm’s law','6 V battery + 100 Ω resistor + ammeter in series.','6 V ÷ 100 Ω = 0.060 A.','ohm'],
 ['Lower the current','6 V battery + 200 Ω resistor + ammeter in series.','Doubling resistance halves the current to 0.030 A.','lowcurrent'],
 ['Use one cell','Light a 20 Ω lamp with a 3 V cell.','3 V ÷ 20 Ω = 0.150 A.','celllamp'],
 ['Two lamps in series','6 V battery + two 20 Ω lamps in series.','Both lamps carry 0.150 A and share the 6 V.','serieslamps'],
 ['Two lamp branches','6 V battery + two 20 Ω lamps in parallel.','Each lamp has 6 V and carries 0.300 A.','parallellamps'],
 ['Tune an LDR','6 V battery + 20 Ω lamp + LDR; set current to 0.030 A.','Set the LDR to 180 Ω for a total resistance of 200 Ω.','ldrtarget'],
 ['Try a thermistor','6 V battery + 20 Ω lamp + 100 Ω thermistor in series.','6 V ÷ 120 Ω = 0.050 A.','thermistortarget'],
 ['Turn a diode','6 V battery + 100 Ω resistor + forward diode.','The simplified diode model gives about 0.0525 A.','forwarddiode'],
 ['Add a fuse','6 V battery + 1 Ω fuse + 100 Ω resistor in series.','About 0.0594 A flows, below the demonstration fuse rating.','fusepath'],
 ['Full toolkit','Use a switch, variable resistor, lamp and both meters; set 0.020–0.040 A.','Use series current measurement, parallel voltage measurement and a closed switch.','master'],
 ['Share it unequally','6 V + 100 Ω and 200 Ω in series; measure across 200 Ω.','The current is 0.020 A; the 200 Ω resistor has 4 V.','unequalseries'],
 ['Unequal branches','6 V + 100 Ω and 200 Ω in parallel.','The branches carry 0.060 A and 0.030 A; the source supplies 0.090 A.','unequalparallel'],
 ['Switch an LED','Light an LED with a closed switch and a 330 Ω resistor at 6 V.','A closed series switch gives about 12.69 mA; opening it stops the current.','ledswitch'],
 ['Final check','6 V + 300 Ω resistor; add both meters correctly.','The series ammeter reads 0.020 A; the parallel voltmeter reads 6 V.','finalcheck']
];
const detectives=[['A meter blocks the way','The lamp stays dark. Check the meter.','A voltmeter has infinite resistance. Replace the series voltmeter with an ammeter.','series-meter'],['A dangerous shortcut','The ammeter is across the battery. Fix it.','Never place an ammeter directly across a source. Put it in series with the load.','short-meter'],['The backwards LED','The LED stays dark. Fix its direction.','An LED conducts only from anode to cathode. Reconnect its anode towards the source’s + terminal and its cathode towards −. Rotation changes the drawing, not the attached wire ends.','reverse-led']];
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function beep(){if(!sound)return;try{const ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);g.gain.value=.025;o.frequency.value=660;o.start();o.stop(ac.currentTime+.1);o.onended=()=>ac.close();}catch{}}
// A wall-clock deadline keeps a 90-second attempt accurate across slow frames and reloads.
const MISSION_SECONDS=90;
let missionPhase='ready',missionDeadline=null,retryLocks={};
function resetAttempt(){missionPhase=retryLocks[mission]?'expired':'ready';missionDeadline=null;remaining=retryLocks[mission]?0:MISSION_SECONDS;timerOn=false;running=false;result=null;missionPassSignature='';}
function refreshMissionClock(){
 const locked=missionPhase==='ready'||missionPhase==='paused'||missionPhase==='expired';
 $('#missionStartOverlay').hidden=!locked;
 $('#missionStart').textContent=missionPhase==='expired'?'Retry move':missionPhase==='paused'?'Resume':'Start';
 $('#missionStartTitle').textContent=missionPhase==='expired'?'Time’s up':missionPhase==='paused'?'Paused':'Ready?';
 $('#missionStartNote').textContent=missionPhase==='expired'?'Copy your move; ask your teacher to approve.':'1 minute 30 seconds for this mission.';
 $('#run').disabled=missionPhase==='ready'||missionPhase==='expired';
 $('#missionClock').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
 $('#missionClock').classList.toggle('time-low',remaining<=15&&missionPhase==='running');
 $('#missionClock').setAttribute('aria-label',remaining+' seconds remaining');
}
function beginMission(){
 if(missionPhase==='expired'){showDance('retry');return;}
 if(missionPhase==='complete'){running=true;changed();return;}
 missionPhase='running';missionDeadline=Date.now()+remaining*1000;timerOn=true;running=true;changed();renderTimer();
}
function pauseMission(){
 if(missionPhase==='running'){remaining=Math.max(0,Math.ceil((missionDeadline-Date.now())/1000));missionPhase='paused';}
 timerOn=false;missionDeadline=null;running=false;changed();renderTimer();
}
function expireMission(){
 if(missionPhase!=='running')return;
 retryLocks[mission]=true;missionPhase='expired';remaining=0;timerOn=false;missionDeadline=null;running=false;result=null;missionPassSignature='';cancelWireGesture();drag=null;
 $('#answerDialog').close();$('#explanation').hidden=true;changed();renderTimer();showDance('retry');beep();
}
function tickMissionClock(){
 if(missionPhase!=='running'||!timerOn||missionDeadline===null)return;
 const next=Math.max(0,Math.ceil((missionDeadline-Date.now())/1000));
 if(next!==remaining){remaining=next;renderTimer();persist();}
 if(remaining===0)expireMission();
}
function retryMission(){delete retryLocks[mission];resetAttempt();changed();renderTimer();notify('Ready for another try');}
$('#missionStart').onclick=beginMission;
setInterval(tickMissionClock,100);

function persist(){try{localStorage.setItem('circuitlab-v1',JSON.stringify({state,classroom,mission,detective,mode,serial,example,retryLocks,attempt:{phase:missionPhase,remaining,deadline:missionDeadline}}));$('#saveStatus').textContent='Saved';}catch{$('#saveStatus').textContent='Not saved — keep this tab open';}}
function checkpoint(){history.push(JSON.stringify(state));if(history.length>80)history.shift();future=[];}
function changed(){if(missionPhase==='running'&&missionDeadline!==null&&Date.now()>=missionDeadline){expireMission();return;}result=running?CircuitSolver.solve(state):null;renderBoard();renderReadings();validate();refreshMissionClock();persist();$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;}
function part(type,x,y,value){return {id:'p'+(++serial),type,x,y,rotation:0,value:value??PARTS[type].value,closed:false};}
function terminal(c,t){const a=(c.rotation||0)*Math.PI/180,d=t===0?-50:50;return {x:c.x+d*Math.cos(a),y:c.y+d*Math.sin(a)};}
function endpoint(key){const [id,t]=key.split(':'),c=state.components.find(c=>c.id===id);return c?terminal(c,+t):null;}
// Orthogonal grid routing avoids component symbols and discourages coincident wires.
const routes=new Map();
function routeAll(){routes.clear();const occupied=new Set(),step=10,W=121,H=77;
 const key=(x,y)=>y*W+x,point=k=>({x:k%W*step,y:Math.floor(k/W)*step});
 const blocked=new Set();for(const c of state.components)for(let y=Math.max(0,c.y-60);y<=Math.min(760,c.y+60);y+=10)for(let x=Math.max(0,c.x-60);x<=Math.min(1200,c.x+60);x+=10)blocked.add(key(Math.round(x/10),Math.round(y/10)));
 for(const w of state.wires){const a=endpoint(w.a),b=endpoint(w.b);if(!a||!b)continue;
 const escape=(terminalKey)=>{const [id,t]=terminalKey.split(':'),c=state.components.find(c=>c.id===id),ang=c.rotation*Math.PI/180,d=+t===0?-80:80;return {x:Math.round((c.x+d*Math.cos(ang))/10)*10,y:Math.round((c.y+d*Math.sin(ang))/10)*10};};
 const start=escape(w.a),end=escape(w.b);
 function leg(start,end){const sk=key(start.x/10,start.y/10),ek=key(end.x/10,end.y/10),dist=new Map([[sk,0]]),prev=new Map(),heap=[];
 function push(k,f){heap.push({k,f});let i=heap.length-1;while(i>0){let p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}
 function pop(){const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let l=i*2+1,r=l+1,j=i;if(l<heap.length&&heap[l].f<heap[j].f)j=l;if(r<heap.length&&heap[r].f<heap[j].f)j=r;if(j===i)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return top;}
 const heuristic=k=>{const p=point(k);return (Math.abs(p.x-end.x)+Math.abs(p.y-end.y))/10;};push(sk,heuristic(sk));const done=new Set();let found=false;
 while(heap.length){const {k}=pop();if(done.has(k))continue;done.add(k);if(k===ek){found=true;break;}const x=k%W,y=Math.floor(k/W);for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;const nk=key(nx,ny);if(blocked.has(nk)&&nk!==ek)continue;const pk=prev.get(k),turn=pk!==undefined&&((k-pk)!==(nk-k))?6:0;const nd=dist.get(k)+1+turn+(occupied.has(nk)?8:0);if(nd<(dist.get(nk)??Infinity)){dist.set(nk,nd);prev.set(nk,k);push(nk,nd+heuristic(nk));}}}
 if(found){const rev=[];let k=ek;while(k!==sk){rev.push(point(k));k=prev.get(k);}rev.push(start);return rev.reverse();}return [start,{x:start.x,y:end.y},end];}
 const bend=w.bend&&Number.isFinite(w.bend.x)&&Number.isFinite(w.bend.y)&&!blocked.has(key(w.bend.x/10,w.bend.y/10))?w.bend:null;
 const pts=[a,...leg(start,bend||end),...(bend?leg(bend,end).slice(1):[]),b];
 // Keep only bends so arrow animation and SVG paths stay small.
 const compact=[pts[0]];for(let i=1;i<pts.length-1;i++){const p=pts[i-1],q=pts[i],r=pts[i+1];if((q.x-p.x)*(r.y-q.y)!==(q.y-p.y)*(r.x-q.x))compact.push(q);}compact.push(pts.at(-1));routes.set(w.id,compact);
 for(const p of pts)occupied.add(key(Math.round(p.x/10),Math.round(p.y/10)));
 }
}
function wirePath(w){const pts=routes.get(w.id)||[];return pts.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');}
function wirePoints(w){return routes.get(w.id)||[];}
function svgNode(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function fmt(n,unit){return n===null||n===undefined||!Number.isFinite(n)?'Undefined':`${Math.abs(n)<1e-10?0:+n.toPrecision(4)} ${unit}`;}
const physicalDefinitionNode=svgNode('g');physicalDefinitionNode.innerHTML=physicalDefs();$('#board defs').append(...physicalDefinitionNode.children);
function setComponentView(view){componentView=view;try{localStorage.setItem('circuitlab-view',view);}catch{}renderBoard();}
$('#physicalView').onclick=()=>setComponentView('physical');$('#symbolView').onclick=()=>setComponentView('symbols');
function renderBoard(){
 routeAll();const wg=$('#wires'),cg=$('#components');wg.replaceChildren();cg.replaceChildren();
 for(const w of state.wires){const g=svgNode('g',{'data-wire':w.id});g.append(svgNode('path',{d:wirePath(w),class:'wire-hit'}),svgNode('path',{d:wirePath(w),class:'wire'+(selected===w.id?' selected':'')}));wg.append(g);}
 for(const c of state.components){const g=svgNode('g',{transform:`translate(${c.x},${c.y})`,'data-part':c.id,class:'part'+(selected===c.id?' selected':'')});
  if(selected===c.id)g.append(svgNode('rect',{x:-66,y:-65,width:132,height:120,rx:12,class:'selection'}));
  g.append(svgNode('rect',{x:-42,y:-40,width:84,height:80,fill:'transparent',class:'part-hit'}));
  const sym=svgNode('g',{transform:`rotate(${c.rotation||0})`});
  const rr=result?.ok?result.readings[c.id]:null;
  const shape=svgNode('g');shape.innerHTML=componentView==='physical'?physicalPart(c,rr):symbol(c.type,c.closed);
  if(componentView==='symbols'&&rr&&(c.type==='lamp'&&rr.power>1e-8||c.type==='led'&&rr.current>1e-5))sym.append(svgNode('circle',{r:28,fill:'var(--orange)',opacity:Math.min(.85,Math.max(.1,(rr.power||0)/1.8)),stroke:'none'}));
  sym.append(shape);g.append(sym);
  const label=svgNode('text',{y:48,'text-anchor':'middle',class:'part-label'});label.textContent=PARTS[c.type].name+(c.value!==undefined?' · '+c.value+' '+PARTS[c.type].unit:'');g.append(label);
  for(let t=0;t<2;t++){const p=terminal(c,t);const hit=svgNode('circle',{cx:p.x-c.x,cy:p.y-c.y,r:24,fill:'transparent','data-terminal':c.id+':'+t});g.append(hit);g.append(svgNode('circle',{cx:p.x-c.x,cy:p.y-c.y,r:7,class:'terminal'+(armed===c.id+':'+t?' armed':''),'data-terminal':c.id+':'+t}));}
  if(selected===c.id){const control=svgNode('g',{'data-rotate-part':c.id,class:'part-rotate',role:'button',tabindex:'0','aria-label':'Rotate '+PARTS[c.type].name});control.append(svgNode('rect',{x:-38,y:-80,width:76,height:40,rx:12}));const text=svgNode('text',{x:0,y:-55,'text-anchor':'middle'});text.textContent='↻ Rotate';control.append(text);g.append(control);}
  cg.append(g);
 }
 for(const [id,view] of [['physicalView','physical'],['symbolView','symbols']]){const active=componentView===view;$('#'+id).classList.toggle('active',active);$('#'+id).setAttribute('aria-pressed',active);}
 renderWireHandles();
 renderGuide();
 $('#empty').hidden=!!state.components.length||guideVisible;
 $('#selectTool').classList.toggle('active',tool==='select'&&!placing);$('#wireTool').classList.toggle('active',tool==='wire');
 document.querySelectorAll('#parts button').forEach(b=>b.classList.toggle('active',b.dataset.type===placing||b.dataset.type==='wire'&&tool==='wire'));
}
function renderReadings(){
 $('#runBadge').textContent=running?'● Live':'Paused';$('#runBadge').classList.toggle('live',running);$('#run').classList.toggle('active',running);
 const fb=$('#feedback');fb.className=result&&!result.ok?'error':'';fb.replaceChildren();
 const messages=result?result.messages:['Build a circuit, then press Run.'];
 for(const msg of messages.slice(0,5)){const p=document.createElement('p');p.textContent=msg;fb.append(p);}
 const measure=$('#measurements');measure.replaceChildren();
 for(const c of state.components){if(!['ammeter','voltmeter','cell','battery','supply','lamp','resistor','led','variable','ldr','thermistor'].includes(c.type))continue;
  const r=result?.ok?result.readings[c.id]:null,e=document.createElement('div');e.className='reading';const name=document.createElement('span');name.textContent=PARTS[c.type].name+' '+c.id.slice(1);const v=document.createElement('b');v.textContent=!r?'—':c.type==='voltmeter'?fmt(r.voltage,'V'):fmt(r.current,'A');e.append(name,v);measure.append(e);}
 if(!measure.children.length)measure.textContent='Add a battery and a lamp.';
 renderInspector();
}
function renderInspector(){const box=$('#inspector');box.replaceChildren();const c=state.components.find(c=>c.id===selected);
 const wire=state.wires.find(w=>w.id===selected);if(wire){box.innerHTML='<h3>Wire</h3><p>Drag an end to reconnect; drag the middle to stretch.</p>';const reset=document.createElement('button');reset.textContent='Auto route';reset.onclick=()=>{if(wire.bend){checkpoint();delete wire.bend;changed();}};box.append(reset);return;}
 if(!c){box.innerHTML='<h3>Settings</h3><p>Tap a part to change it.</p>';return;}
 const p=PARTS[c.type],h=document.createElement('h3');h.textContent=p.name;const info=document.createElement('p');info.textContent=p.info;box.append(h);const ref=document.createElement('details');const title=document.createElement('summary');title.textContent='Circuit symbol';ref.append(title);const diagram=document.createElement('div');diagram.className='symbol-reference';diagram.innerHTML=icon(c.type);ref.append(diagram,info);box.append(ref);
 if(p.range){const l=document.createElement('label');l.textContent=`${c.type==='cell'||c.type==='battery'||c.type==='supply'?'Voltage':'Resistance'}: ${c.value} ${p.unit}`;const input=document.createElement('input');input.type='range';[input.min,input.max,input.step]=p.range;input.value=c.value;input.setAttribute('aria-label',p.name+' '+p.unit);input.onpointerdown=()=>checkpoint();input.onkeydown=e=>{if(e.key.startsWith('Arrow'))checkpoint();};input.oninput=()=>{c.value=+input.value;l.firstChild.textContent=`${p.unit==='V'?'Voltage':'Resistance'}: ${c.value} ${p.unit}`;result=running?CircuitSolver.solve(state):null;renderBoard();validate();persist();};input.onchange=changed;l.append(input);box.append(l);}
 if(c.type==='switch'){const b=document.createElement('button');b.textContent=c.closed?'On · tap to turn off':'Off · tap to turn on';b.onclick=()=>{checkpoint();c.closed=!c.closed;changed();};box.append(b);}
 if(c.type==='fuse'){const b=document.createElement('button');b.textContent=c.blown?'Open fuse · restore':'Open fuse manually';b.onclick=()=>{checkpoint();c.blown=!c.blown;changed();};box.append(b);}
 const r=result?.ok?result.readings[c.id]:null;if(r){const reading=document.createElement('p');reading.textContent=`ΔV = ${fmt(r.voltage,'V')} · I = ${fmt(r.current,'A')} · P = ${fmt(r.power,'W')}`;box.append(reading);}
}
function point(ev){const p=$('#board').createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform($('#board').getScreenCTM().inverse());}
function snap(n,min,max){return Math.max(min,Math.min(max,Math.round(n/20)*20));}
function addAt(type,p){checkpoint();const c=part(type,snap(p.x,80,1120),snap(p.y,80,680));state.components.push(c);selected=c.id;placing=null;armed=null;changed();beep();}
// One pointer gesture draws a complete wire; tap-to-connect remains available.
let wireGesture=null;
function nearestTerminal(p,exclude=null){let found=null,best=25;for(const c of state.components)for(let t=0;t<2;t++){const key=c.id+':'+t;if(key===exclude)continue;const q=terminal(c,t),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best){found=key;best=d;}}return found;}
function connectTerminals(a,b,wire=null,side=null){
 if(!a||!b||a===b)return false;
 if(state.wires.some(w=>w!==wire&&(w.a===a&&w.b===b||w.a===b&&w.b===a))){notify('Already joined');return false;}
 checkpoint();
 if(wire){wire[side]=b;delete wire.bend;selected=wire.id;}else{state.wires.push({id:'w'+(++serial),a,b});selected=null;}
 armed=null;changed();beep();return true;
}
function wireMidpoint(w){const pts=wirePoints(w);let length=0;for(let i=1;i<pts.length;i++)length+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);let d=length/2;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l&&l)return {x:a.x+(b.x-a.x)*d/l,y:a.y+(b.y-a.y)*d/l};d-=l;}return pts[0];}
function renderWireHandles(){const layer=$('#wireHandles');layer.replaceChildren();const w=state.wires.find(w=>w.id===selected);if(!w)return;
 const handles=[['a',endpoint(w.a)],['b',endpoint(w.b)],['bend',wireMidpoint(w)]];
 for(const [side,p]of handles){if(!p)continue;const g=svgNode('g',{'data-wire-handle':side,'data-handle-wire':w.id,class:'wire-handle'});const title=svgNode('title');title.textContent=side==='bend'?'Drag to stretch':'Drag to reconnect';g.append(title,svgNode('circle',{cx:p.x,cy:p.y,r:22,fill:'transparent'}),svgNode('circle',{cx:p.x,cy:p.y,r:side==='bend'?10:12,class:'wire-grip'}));if(side==='bend')g.append(svgNode('path',{d:`M${p.x-4} ${p.y}H${p.x+4} M${p.x} ${p.y-4}V${p.y+4}`,class:'wire-grip-mark'}));layer.append(g);}
}
function renderWirePreview(p){const layer=$('#wirePreview');layer.replaceChildren();if(!wireGesture?.moved)return;
 const gesture=wireGesture;
 if(gesture.kind==='bend'){const path=svgNode('path',{d:`M${gesture.from.x} ${gesture.from.y}H${p.x}V${p.y}H${gesture.to.x}V${gesture.to.y}`,class:'wire-preview'});layer.append(path);return;}
 const target=nearestTerminal(p,gesture.fixed),a=endpoint(gesture.fixed),b=target?endpoint(target):p;if(!a)return;
 layer.append(svgNode('path',{d:`M${a.x} ${a.y}H${(a.x+b.x)/2}V${b.y}H${b.x}`,class:'wire-preview'}));
 if(target)layer.append(svgNode('circle',{cx:b.x,cy:b.y,r:15,class:'wire-snap'}));
}
function cancelWireGesture(){wireGesture=null;armed=null;$('#wirePreview').replaceChildren();}
$('#board').addEventListener('pointerdown',ev=>{
 if(missionPhase!=='running'&&missionPhase!=='complete')return;
 if(ev.button!==0||wireGesture||drag)return;ev.preventDefault();const p=point(ev),rotateHandle=ev.target.closest('[data-rotate-part]'),handle=ev.target.closest('[data-wire-handle]'),term=ev.target.closest('[data-terminal]'),pe=ev.target.closest('[data-part]'),we=ev.target.closest('[data-wire]');
 if(rotateHandle){selected=rotateHandle.dataset.rotatePart;rotate();return;}
 if(handle){const w=state.wires.find(w=>w.id===handle.dataset.handleWire),side=handle.dataset.wireHandle;armed=null;wireGesture={kind:side==='bend'?'bend':'reconnect',wireId:w.id,side,fixed:side==='a'?w.b:w.a,start:p,from:endpoint(w.a),to:endpoint(w.b),pointer:ev.pointerId,moved:false};$('#board').setPointerCapture(ev.pointerId);return;}
 if(term){const key=term.dataset.terminal;
  if(armed&&armed!==key){connectTerminals(armed,key);armed=null;renderBoard();return;}
  wireGesture={kind:'new',fixed:key,start:p,pointer:ev.pointerId,moved:false,wasArmed:armed===key};armed=key;renderBoard();$('#board').setPointerCapture(ev.pointerId);return;
 }
 if(placing){addAt(placing,p);return;}
 if(we){selected=we.dataset.wire;armed=null;renderBoard();renderInspector();return;}
 if(pe){selected=pe.dataset.part;renderBoard();renderInspector();if(tool==='select'){const c=state.components.find(c=>c.id===selected);drag={id:c.id,start:p,x:c.x,y:c.y,pointer:ev.pointerId,moved:false,snapshot:JSON.stringify(state)};$('#board').setPointerCapture(ev.pointerId);}return;}
 selected=null;armed=null;renderBoard();renderInspector();
});
$('#board').addEventListener('pointermove',ev=>{
 if(wireGesture){if(ev.pointerId!==wireGesture.pointer)return;const p=point(ev);if(Math.hypot(p.x-wireGesture.start.x,p.y-wireGesture.start.y)>6)wireGesture.moved=true;renderWirePreview(p);return;}
 if(!drag||ev.pointerId!==drag.pointer)return;const p=point(ev),c=state.components.find(c=>c.id===drag.id);if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>6)drag.moved=true;if(drag.moved){c.x=snap(drag.x+p.x-drag.start.x,80,1120);c.y=snap(drag.y+p.y-drag.start.y,80,680);renderBoard();}
});
function finishPointer(ev,cancelled=false){
 if(wireGesture){if(ev.pointerId!==wireGesture.pointer)return;const gesture=wireGesture,p=point(ev);wireGesture=null;$('#wirePreview').replaceChildren();
  if(cancelled){armed=null;renderBoard();return;}
  if(!gesture.moved){if(gesture.kind==='new')armed=gesture.wasArmed?null:gesture.fixed;renderBoard();return;}
  armed=null;
  if(gesture.kind==='bend'){
   const w=state.wires.find(w=>w.id===gesture.wireId),bend={x:snap(p.x,20,1180),y:snap(p.y,20,740)};
   if(state.components.some(c=>Math.abs(c.x-bend.x)<=65&&Math.abs(c.y-bend.y)<=65)){notify('Stretch into an empty space');renderBoard();return;}
   checkpoint();w.bend=bend;changed();return;
  }
  const target=nearestTerminal(p,gesture.fixed),wire=state.wires.find(w=>w.id===gesture.wireId);
  if(target){if(!wire||wire[gesture.side]!==target)connectTerminals(gesture.fixed,target,wire,gesture.side);}
  else notify('Drop on a terminal dot');
  renderBoard();return;
 }
 if(!drag||ev.pointerId!==drag.pointer)return;
 const old=drag;drag=null;
 if(old.moved){if(cancelled){state=JSON.parse(old.snapshot);renderBoard();}else{history.push(old.snapshot);future=[];changed();}}
}
$('#board').addEventListener('pointerup',ev=>finishPointer(ev));
$('#board').addEventListener('pointercancel',ev=>finishPointer(ev,true));
$('#board').addEventListener('lostpointercapture',ev=>{if(wireGesture?.pointer===ev.pointerId||drag?.pointer===ev.pointerId)finishPointer(ev,true);});
$('#board').addEventListener('dblclick',ev=>{if(ev.target.closest('[data-rotate-part]'))return;const c=state.components.find(c=>c.id===ev.target.closest('[data-part]')?.dataset.part);if(c?.type==='switch'){checkpoint();c.closed=!c.closed;changed();}});
$('#board').addEventListener('dragover',ev=>ev.preventDefault());$('#board').addEventListener('drop',ev=>{ev.preventDefault();const t=ev.dataTransfer.getData('text/plain');if(t==='wire'){tool='wire';placing=armed=null;renderBoard();notify('Drag from one dot to another');}else if(PARTS[t])addAt(t,point(ev));});
for(const [type,p] of Object.entries(PARTS)){const b=document.createElement('button');b.dataset.type=type;b.innerHTML=icon(type)+'<span>'+p.name+'</span>';b.title=p.info;b.draggable=true;b.onclick=()=>{if(mode==='explorer'){showSymbol(type);return;}if(type==='wire'){tool='wire';placing=armed=null;renderBoard();notify('Drag from one dot to another');return;}placing=placing===type?null:type;armed=null;tool='select';renderBoard();notify('Now tap the board');};b.ondragstart=ev=>ev.dataTransfer.setData('text/plain',type);$('#parts').append(b);}
function rotate(){const c=state.components.find(c=>c.id===selected);if(c){checkpoint();c.rotation=((c.rotation||0)+90)%360;changed();}}
function remove(){cancelWireGesture();if(!selected)return;checkpoint();state.components=state.components.filter(c=>c.id!==selected);state.wires=state.wires.filter(w=>w.id!==selected&&!w.a.startsWith(selected+':')&&!w.b.startsWith(selected+':'));selected=null;armed=null;changed();}
$('#rotate').onclick=rotate;$('#delete').onclick=remove;$('#clear').onclick=()=>{checkpoint();state={components:[],wires:[]};selected=armed=null;changed();};
$('#undo').onclick=()=>{if(history.length){future.push(JSON.stringify(state));state=JSON.parse(history.pop());selected=armed=null;changed();}};
$('#redo').onclick=()=>{if(future.length){history.push(JSON.stringify(state));state=JSON.parse(future.pop());selected=armed=null;changed();}};
$('#selectTool').onclick=()=>{tool='select';placing=null;armed=null;renderBoard();};$('#wireTool').onclick=()=>{tool='wire';placing=null;renderBoard();notify('Drag from one dot to another');};
$('#run').onclick=()=>{if(missionPhase==='paused'){beginMission();return;}if(missionPhase!=='running'&&missionPhase!=='complete')return;running=true;changed();};$('#pause').onclick=()=>{running=false;changed();};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){cancelWireGesture();if(drag){state=JSON.parse(drag.snapshot);drag=null;}placing=armed=null;renderBoard();}if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-rotate-part]')){e.preventDefault();selected=e.target.closest('[data-rotate-part]').dataset.rotatePart;rotate();}if(e.key.toLowerCase()==='r')rotate();if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'#redo':'#undo').click();}});
// Templates are real editable networks, not illustrative diagrams.
function makeExample(name){const C=[],W=[];const add=(type,x,y,v)=>{const c=part(type,x,y,v);C.push(c);return c;};const link=(a,t,b,u)=>W.push({id:'w'+(++serial),a:a.id+':'+t,b:b.id+':'+u});
 const s=add('battery',230,220,6);
 if(name==='parallel'){const a=add('resistor',650,220,100),b=add('resistor',650,460,100);link(s,0,a,0);link(a,0,b,0);link(a,1,b,1);link(b,1,s,1);}
 else if(name==='series'){const a=add('resistor',650,220,100),b=add('resistor',650,460,100);link(s,0,a,0);link(a,1,b,0);link(b,1,s,1);}
 else if(name==='led'||name==='reverse-led'){const r=add('resistor',650,220,330),d=add('led',650,460);link(s,0,r,0);link(r,1,d,name==='reverse-led'?1:0);link(d,name==='reverse-led'?0:1,s,1);}
 else {const lamp=add('lamp',690,440,20);if(name==='meters'||name==='series-meter'){const a=add(name==='series-meter'?'voltmeter':'ammeter',650,220);link(s,0,a,0);link(a,1,lamp,0);link(lamp,1,s,1);if(name==='meters'){const v=add('voltmeter',920,440);link(v,0,lamp,0);link(v,1,lamp,1);}}
 else {link(s,0,lamp,0);link(lamp,1,s,1);if(name==='short-meter'){const a=add('ammeter',650,220);link(s,0,a,0);link(a,1,s,1);}}}
 return {components:C,wires:W};
}
function load(name){checkpoint();state=makeExample(name);example=name;selected=armed=null;running=missionPhase==='running'||missionPhase==='complete';changed();}
$('#examples').onchange=e=>{if(e.target.value)load(e.target.value);};$('#reset').onclick=()=>{if(example)load(example);else{$('#clear').click();}};
function showSymbol(type){$('#symbolDetail').innerHTML=icon(type)+'<h2>'+PARTS[type].name+'</h2><p>'+PARTS[type].info+'</p>';$('#symbolDialog').showModal();}$('#closeDialog').onclick=()=>$('#symbolDialog').close();
let quizType='';function quiz(){const keys=Object.keys(PARTS);quizType=keys[Math.floor(Math.random()*keys.length)];const choices=[quizType,...keys.filter(t=>t!==quizType).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);const box=$('#explorerPanel');box.innerHTML='<h2>Which symbol is this?</h2><svg class="quiz-symbol" viewBox="-60 -55 120 100">'+symbol(quizType)+'</svg><div id="quizChoices"></div><p id="quizAnswer" role="status">Choose its name.</p>';for(const t of choices){const b=document.createElement('button');b.textContent=PARTS[t].name;b.onclick=()=>{const correct=t===quizType;$('#quizAnswer').textContent=correct?'Correct! '+PARTS[t].info:'Not quite. Try again.';if(correct){beep();if(!$('#nextQuiz')){const n=document.createElement('button');n.id='nextQuiz';n.textContent='Next symbol';n.onclick=quiz;box.append(n);}}};$('#quizChoices').append(b);}}
// Answer networks are independent examples; opening a guide never edits student state.
let guideVisible=false,guideKey='';
function helpKey(){return [mode,mission,detective,example].join(':');}
function guideMission(){
 if(mode==='missions'||mode==='challenge')return mission;
 if(mode==='detective')return detective===2?7:2;
 return ({series:4,parallel:5,meters:3,led:7,'reverse-led':7,'series-meter':2,'short-meter':2})[example]??0;
}
function solutionCircuit(index){
 const components=[],wires=[];let id=0;
 const add=(type,x,y,value)=>{const c={id:'guide'+(++id),type,x,y,rotation:0,value:value??PARTS[type].value,closed:type==='switch'};components.push(c);return c;};
 const join=(a,t,b,u,via=[])=>wires.push({id:'guide-wire'+wires.length,a:a.id+':'+t,b:b.id+':'+u,via});
 const source=add(index===12?'cell':'battery',200,380,index===12?3:6);source.rotation=90;
 const kinds=[['lamp'],['switch','lamp'],['ammeter','lamp'],['lamp'],['resistor','resistor'],['resistor'],['variable','lamp'],['resistor','led'],['ldr','lamp'],['switch','ammeter','lamp'],['ammeter','resistor'],['ammeter','resistor'],['lamp'],['lamp','lamp'],['lamp'],['ldr','lamp'],['thermistor','lamp'],['resistor','diode'],['fuse','resistor'],['switch','variable','ammeter','lamp'],['resistor','resistor'],['resistor'],['switch','resistor','led'],['ammeter','resistor']][index];
 const chain=kinds.map((type,i)=>add(type,kinds.length===1?650:350+i*600/(kinds.length-1),180,type==='resistor'?(index===7||index===22?330:index===11||index===20&&i===1?200:index===23?300:100):type==='variable'?200:type==='ldr'&&index===15?180:undefined));
 join(source,0,chain[0],0,[[200,180]]);
 for(let i=1;i<chain.length;i++)join(chain[i-1],1,chain[i],0);
 join(chain.at(-1),1,source,1,[[1080,180],[1080,620],[200,620]]);
 if(index===5||index===14||index===21){const second=add(index===14?'lamp':'resistor',650,420,index===14?20:index===21?200:100);join(chain[0],0,second,0,[[500,180],[500,420]]);join(chain[0],1,second,1,[[800,180],[800,420]]);}
 if(index===3||index===9||index===19||index===20||index===23){const lamp=chain.at(-1),meter=add('voltmeter',lamp.x,420);join(lamp,0,meter,0);join(lamp,1,meter,1);}
 return {components,wires};
}
function guideEndpoint(network,key){const [id,t]=key.split(':');return terminal(network.components.find(c=>c.id===id),+t);}
function guideWirePath(network,wire){const pts=[guideEndpoint(network,wire.a),...(wire.via||[]).map(([x,y])=>({x,y})),guideEndpoint(network,wire.b)];let path='M'+pts[0].x+' '+pts[0].y;for(let i=1;i<pts.length;i++){path+='H'+pts[i].x+'V'+pts[i].y;}return path;}
function drawGuide(container,network,answer=false){
 container.replaceChildren();
 network.wires.slice(0,answer?network.wires.length:1).forEach(w=>container.append(svgNode('path',{d:guideWirePath(network,w),class:'guide-wire'})));
 network.components.forEach((c,i)=>{
  const g=svgNode('g',{'data-guide-part':c.type,transform:`translate(${c.x},${c.y})`}),shape=svgNode('g',{transform:`rotate(${c.rotation})`});shape.innerHTML=symbol(c.type,c.closed);g.append(shape);
  const label=svgNode('text',{x:['cell','battery'].includes(c.type)?-105:0,y:['cell','battery'].includes(c.type)?10:65,'text-anchor':'middle',class:'guide-label'});label.textContent=`${i+1}. ${PARTS[c.type].name}`+(c.value!==undefined?` · ${c.value} ${PARTS[c.type].unit}`:'');g.append(label);
  for(let t=0;t<2;t++){const p=terminal(c,t);g.append(svgNode('circle',{cx:p.x-c.x,cy:p.y-c.y,r:7,class:'guide-dot'}));if(answer){const letter=svgNode('text',{x:p.x-c.x,y:p.y-c.y-14,'text-anchor':'middle',class:'guide-terminal-label'});letter.textContent=t===0?'a':'b';g.append(letter);}}
  container.append(g);
 });
}
function renderGuide(){
 if(guideKey!==helpKey()){guideKey=helpKey();guideVisible=false;cancelDance();$('#answerDialog').close();$('#answerDrawing').replaceChildren();$('#answerConnections').replaceChildren();}
 const enabled=mode!=='explorer';$('#boardHelp').hidden=!enabled;
 $('#hint').setAttribute('aria-pressed',guideVisible);$('#hint').textContent=guideVisible?'Hide hint':'Hint';
 $('#hintLayer').replaceChildren();$('#hintLabel').hidden=!guideVisible;$('#empty').hidden=!!state.components.length||guideVisible;
 if(guideVisible&&enabled)drawGuide($('#hintLayer'),solutionCircuit(guideMission()));
}
// A local classroom gate: the teacher observes the student and approves with a PIN.
// No camera or movement detection; PIN verification never marks a circuit complete.
const DANCE_MOVES=[
 {name:'Robot elbows',hint:'Move your elbows like a robot.',css:'robot'},
 {name:'Penguin wobble',hint:'Keep your elbows in and wobble gently.',css:'penguin'},
 {name:'Jelly arms',hint:'Let your arms wiggle like jelly.',css:'jelly'},
 {name:'Disco pointer',hint:'Point up, then across, like a disco star.',css:'disco'},
 {name:'Chicken wings',hint:'Flap your elbows like tiny wings.',css:'chicken'},
 {name:'Window wipers',hint:'Sweep your hands from side to side.',css:'wipers'},
 {name:'Alien hello',hint:'Tilt your head and give a tiny wave.',css:'alien'}
];
const DANCE_PIN_KEY='circuitlab-teacher-pin-v1';
let sessionTeacherPin=null,danceRequest=null,danceTicker=null,danceAssignments=[];
try{const saved=JSON.parse(localStorage.getItem('circuitlab-dance-moves-v1'));if(Array.isArray(saved)&&saved.length===missions.length&&saved.every(i=>Number.isInteger(i)&&i>=0&&i<DANCE_MOVES.length))danceAssignments=saved;}catch{}
if(!danceAssignments.length){let last=-1;while(danceAssignments.length<missions.length){const bag=DANCE_MOVES.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag[0]===last)[bag[0],bag[1]]=[bag[1],bag[0]];danceAssignments.push(...bag);last=bag.at(-1);}danceAssignments.length=missions.length;try{localStorage.setItem('circuitlab-dance-moves-v1',JSON.stringify(danceAssignments));}catch{}}
function teacherPin(){
 if(sessionTeacherPin)return sessionTeacherPin;
 try{const p=JSON.parse(localStorage.getItem(DANCE_PIN_KEY));if(p&&/^[a-f0-9]{32}$/.test(p.salt)&&/^[a-f0-9]{64}$/.test(p.hash))return p;}catch{}
 return null;
}
async function pinDigest(pin,salt){const bytes=new TextEncoder().encode(salt+':'+pin);const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');}
function refreshPinLabel(){$('#teacherPinSetup').textContent=teacherPin()?'Change PIN':'Set PIN';}
function cancelDance(){clearInterval(danceTicker);danceTicker=null;danceRequest=null;$('#approvalPin').value='';$('#danceDialog').close();}
function danceTick(){
 const request=danceRequest;if(!request)return;
 const seconds=Math.max(0,Math.ceil((3000-(performance.now()-request.started))/1000));
 $('#danceCountdown').textContent=seconds?seconds+' s':'Ready';
 $('#danceStatus').textContent=seconds?'Copy the move.':teacherPin()?'Teacher: check the move and enter your PIN.':'Ask your teacher to set a PIN in Teacher tools.';
 $('#approveDance').disabled=seconds>0||!teacherPin()||request.busy;
 $('#approvalPin').disabled=seconds>0||!teacherPin()||request.busy;
 $('#danceFigure').classList.toggle('dance-finished',seconds===0);
}
function showAnswer(){showDance(missionPhase==='expired'?'retry':'answer');}
function showDance(purpose='answer'){
 if($('#answerDialog').open)$('#answerDialog').close();
 cancelDance();$('#explanation').hidden=true;$('#answerDrawing').replaceChildren();$('#answerConnections').replaceChildren();
 const moveIndex=danceAssignments[mission],move=DANCE_MOVES[moveIndex];
 danceRequest={key:helpKey(),started:performance.now(),moveIndex,busy:false,purpose};
 $('#danceTitle').textContent=move.name;$('#danceKicker').textContent=purpose==='retry'?'TIME’S UP · RETRY MOVE':'MOVE TO REVEAL';$('#danceInstruction').textContent=move.hint;
 $('#danceFigure').setAttribute('class','dance-figure move-'+move.css);$('#danceFigure').dataset.move=move.css;
 $('#adaptedMove').setAttribute('aria-pressed','false');$('#adaptedMove').textContent='Seated option';$('#danceAlternative').hidden=true;
 $('#approvalPin').value='';$('#danceError').textContent='';$('#danceDialog').showModal();danceTick();danceTicker=setInterval(danceTick,100);
}
$('#cancelDance').onclick=cancelDance;$('#danceDialog').addEventListener('cancel',cancelDance);
$('#adaptedMove').onclick=()=>{const active=$('#adaptedMove').getAttribute('aria-pressed')!=='true';$('#adaptedMove').setAttribute('aria-pressed',active);$('#danceFigure').classList.toggle('dance-seated',active);$('#danceAlternative').hidden=!active;};
$('#danceApproval').onsubmit=async ev=>{
 ev.preventDefault();const request=danceRequest,pin=teacherPin();
 if(!request||request.busy||request.key!==helpKey()||performance.now()-request.started<3000||!pin)return;
 request.busy=true;danceTick();$('#danceError').textContent='';
 try{
  const valid=await pinDigest($('#approvalPin').value,pin.salt)===pin.hash;
  if(danceRequest!==request||request.key!==helpKey())return;
  $('#approvalPin').value='';
  if(!valid){$('#danceError').textContent='Incorrect PIN. Ask your teacher.';return;}
  const purpose=request.purpose;cancelDance();if(purpose==='retry'){retryMission();return;}if(missionPhase==='expired')return;$('#explanation').hidden=false;$('#explanation').textContent=missions[mission][2];revealAnswer();
 }catch{if(danceRequest===request)$('#danceError').textContent='PIN check unavailable in this browser.';}
 finally{if(danceRequest===request){request.busy=false;danceTick();}}
};
$('#teacherPinSetup').onclick=()=>{$('#oldPinRow').hidden=!teacherPin();$('#oldTeacherPin').value='';$('#newTeacherPin').value='';$('#confirmTeacherPin').value='';$('#pinSetupStatus').textContent='';$('#teacherPinDialog').showModal();};
$('#closePinSetup').onclick=()=>$('#teacherPinDialog').close();
$('#teacherPinForm').onsubmit=async ev=>{
 ev.preventDefault();const existing=teacherPin(),value=$('#newTeacherPin').value;
 if(!/^\d{4,8}$/.test(value)||value!==$('#confirmTeacherPin').value){$('#pinSetupStatus').textContent='Use matching PINs of 4–8 digits.';return;}
 $('#saveTeacherPin').disabled=true;
 try{
  if(existing&&await pinDigest($('#oldTeacherPin').value,existing.salt)!==existing.hash){$('#pinSetupStatus').textContent='Current PIN is incorrect.';return;}
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
  const record={salt,hash:await pinDigest(value,salt)};let saved=true;sessionTeacherPin=record;
  try{localStorage.setItem(DANCE_PIN_KEY,JSON.stringify(record));}catch{saved=false;}
  $('#oldTeacherPin').value=$('#newTeacherPin').value=$('#confirmTeacherPin').value='';$('#teacherPinDialog').close();refreshPinLabel();notify(saved?'Teacher PIN saved':'PIN set for this session');
 }catch{$('#pinSetupStatus').textContent='PIN setup needs a secure, current browser.';}
 finally{$('#saveTeacherPin').disabled=false;}
};
refreshPinLabel();

function revealAnswer(){
 const index=guideMission(),network=solutionCircuit(index),calculated=CircuitSolver.solve(network);
 if(!calculated.ok||!calculated.active){notify('This guide is unavailable.');return;}
 $('#answerTitle').textContent='Answer · '+missions[index][0];
 $('#answerNote').textContent=mode==='detective'?detectives[detective][2]:missions[index][2];
 drawGuide($('#answerDrawing'),network,true);
 const list=$('#answerConnections');list.replaceChildren();
 network.wires.forEach(w=>{const label=key=>{const [id,t]=key.split(':');return `${network.components.findIndex(c=>c.id===id)+1}${+t===0?'a':'b'}`;};const li=document.createElement('li');li.textContent=`Join ${label(w.a)} to ${label(w.b)}.`;list.append(li);});
 $('#answerParts').textContent=network.components.map((c,i)=>`${i+1}. ${PARTS[c.type].name}`).join(' · ');
 $('#answerDialog').showModal();
}
$('#hint').onclick=()=>{guideVisible=!guideVisible;renderGuide();};
$('#showAnswer').onclick=showAnswer;
$('#closeAnswer').onclick=()=>$('#answerDialog').close();

function activity(){const a=$('#activity');a.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');a.append(h,p);$('#explorerPanel').hidden=mode!=='explorer';
 if(mode==='build'){h.textContent='Free build';p.textContent='Add parts → join the dots → press Run.';}
 if(mode==='explorer'){h.textContent='Symbols';p.textContent='Tap a part to learn it. Then try the quiz.';quiz();}
 if(mode==='missions'||mode==='challenge'){const m=missions[mission];h.textContent=`Mission ${mission+1}/${missions.length} · ${m[0]}`;p.textContent=m[1];const progress=document.createElement('div');progress.className='progress';progress.innerHTML='<div style="width:'+classroom.completed.length/missions.length*100+'%"></div>';a.append(progress);const status=document.createElement('span');status.id='missionStatus';a.append(status);const back=document.createElement('button');back.id='missionBack';back.textContent='← Back';back.onclick=backMission;a.append(back);const next=document.createElement('button');next.id='missionNext';next.textContent='Next →';next.disabled=!mayAdvanceMission();next.onclick=nextMission;a.append(next);if(mode==='challenge')scoreboard(a);}
 if(mode==='detective'){const d=detectives[detective];h.textContent=`Case ${detective+1}/3 · ${d[0]}`;p.textContent=d[1];const status=document.createElement('span');status.id='missionStatus';a.append(status);const b=document.createElement('button');b.textContent='Restart';b.onclick=()=>load(d[3]);const next=document.createElement('button');next.textContent='Next case →';next.className='primary';next.onclick=()=>{detective=(detective+1)%detectives.length;load(detectives[detective][3]);activity();};a.append(b,next);}
 document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));validate();renderGuide();
}
function nextMission(){if(!mayAdvanceMission()){notify('Finish this mission first');return;}startMission((mission+1)%missions.length);}
function backMission(){if(mission===0){notify('This is the first mission');return;}startMission(mission-1);}
function startMission(index){
 cancelWireGesture();drag=null;missionPassSignature='';mission=index;
 state={components:[],wires:[]};history=[];future=[];selected=armed=placing=null;example='';$('#examples').value='';resetAttempt();
 $('#explanation').hidden=true;renderTimer();activity();changed();
}
$('#modes').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b)return;mode=b.dataset.mode;placing=armed=null;if(mode==='detective')load(detectives[detective][3]);activity();renderBoard();persist();};
function scoreboard(a){const controls=document.createElement('label');controls.textContent='Participants ';const count=document.createElement('input');count.type='number';count.min=1;count.max=20;count.value=classroom.names.length;count.style.width='70px';count.onchange=()=>{const n=Math.min(20,Math.max(1,+count.value||1));while(classroom.names.length<n){classroom.names.push('Pair '+(classroom.names.length+1));classroom.scores.push(0);}classroom.names.length=n;classroom.scores.length=n;activity();persist();};controls.append(count);a.append(controls);const table=document.createElement('table');table.className='scoreboard';table.innerHTML='<thead><tr><th>Student / pair</th><th>Points</th><th>Teacher awards</th></tr></thead>';const tbody=document.createElement('tbody');classroom.names.forEach((name,i)=>{const tr=document.createElement('tr'),td=document.createElement('td'),inp=document.createElement('input');inp.type='text';inp.maxLength=40;inp.value=name;inp.setAttribute('aria-label','Participant '+(i+1));inp.onchange=()=>{classroom.names[i]=inp.value;persist();};td.append(inp);const score=document.createElement('td');score.textContent=classroom.scores[i];const actions=document.createElement('td');for(const delta of [10,-10]){const b=document.createElement('button');b.textContent=delta>0?'+10':'−10';b.setAttribute('aria-label',(delta>0?'Award':'Remove')+' 10 points for participant '+(i+1));b.onclick=()=>{classroom.scores[i]=Math.max(0,classroom.scores[i]+delta);activity();persist();};actions.append(b);}tr.append(td,score,actions);tbody.append(tr);});table.append(tbody);a.append(table);const p=document.createElement('p');p.className='micro';p.textContent='Give each pair the mission. Check it, then award points.';a.append(p);const reset=document.createElement('button');reset.textContent='Reset scores';reset.onclick=()=>{classroom.scores.fill(0);activity();persist();};a.append(reset);}
function checkMission(index){if(!result?.ok||!result.active)return false;const r=result.readings,cs=state.components,n=result.nodes;const types=t=>cs.filter(c=>c.type===t),live=c=>Math.abs(r[c.id].current)>1e-7,lamps=types('lamp').filter(live),switches=types('switch').filter(c=>c.closed),res=types('resistor');
 const pair=c=>[n[c.id+':0'],n[c.id+':1']],parallel=(a,b)=>{const x=pair(a),y=pair(b);return x[0]===y[0]&&x[1]===y[1]||x[0]===y[1]&&x[1]===y[0];};
 // Remove the selected branch to prove it lies in a necessary series path.
 const seriesWith=(a,b)=>{if(!live(a)||!live(b)||Math.abs(Math.abs(r[a.id].current)-Math.abs(r[b.id].current))>1e-6)return false;const copy=JSON.parse(JSON.stringify(state));copy.components=copy.components.filter(c=>c.id!==a.id);copy.wires=copy.wires.filter(w=>!w.a.startsWith(a.id+':')&&!w.b.startsWith(a.id+':'));const s=CircuitSolver.solve(copy);return s.ok&&Math.abs(s.readings[b.id]?.current||0)<1e-8;};
 const controlled=lamps.some(l=>switches.some(s=>{const copy=JSON.parse(JSON.stringify(state));copy.components.find(c=>c.id===s.id).closed=false;const out=CircuitSolver.solve(copy);return out.ok&&Math.abs(out.readings[l.id].current)<1e-8;}));
 const amp=lamps.some(l=>types('ammeter').some(a=>seriesWith(a,l))),volt=lamps.some(l=>types('voltmeter').some(v=>parallel(v,l)&&Math.abs(r[v.id].voltage)>1e-7));
 const six=cs.some(c=>['battery','cell','supply'].includes(c.type)&&Math.abs(c.value-6)<1e-7&&live(c));
 const close=(a,b)=>Math.abs(a-b)<1e-6,mag=c=>Math.abs(r[c.id].current);
 const measured=(ohms,current)=>six&&res.some(l=>close(l.value,ohms)&&close(mag(l),current)&&types('ammeter').some(a=>seriesWith(a,l)));
 switch(missions[index][3]){case'lamp':return !!lamps.length;case'switch':return controlled;case'ammeter':return amp;case'voltmeter':return volt;case'series':return six&&res.some(a=>a.value===100&&res.some(b=>a!==b&&b.value===100&&seriesWith(a,b)&&Math.abs(Math.abs(r[a.id].current)-.03)<1e-6));case'parallel':return six&&res.some(a=>a.value===100&&res.some(b=>a!==b&&b.value===100&&parallel(a,b)&&Math.abs(Math.abs(r[a.id].current)-.06)<1e-6));case'variable':return lamps.some(l=>Math.abs(r[l.id].current)>=.02&&Math.abs(r[l.id].current)<=.04&&types('variable').some(v=>seriesWith(v,l)));case'led':return types('led').some(l=>r[l.id].current>=.005&&r[l.id].current<=.02&&res.some(v=>seriesWith(v,l)));case'sensor':return lamps.some(l=>[...types('ldr'),...types('thermistor')].some(s=>seriesWith(s,l)));case'all':return controlled&&amp&&volt;
 case'ohm':return measured(100,.06);
 case'lowcurrent':return measured(200,.03);
 case'celllamp':return types('cell').some(c=>close(c.value,3)&&live(c))&&lamps.some(l=>close(l.value,20)&&close(mag(l),.15));
 case'serieslamps':return six&&lamps.some(a=>close(a.value,20)&&close(mag(a),.15)&&lamps.some(b=>a!==b&&close(b.value,20)&&seriesWith(a,b)));
 case'parallellamps':return six&&lamps.some(a=>close(a.value,20)&&close(mag(a),.3)&&lamps.some(b=>a!==b&&close(b.value,20)&&parallel(a,b)));
 case'ldrtarget':return six&&lamps.some(l=>close(l.value,20)&&close(mag(l),.03)&&types('ldr').some(c=>seriesWith(c,l)));
 case'thermistortarget':return six&&lamps.some(l=>close(l.value,20)&&close(mag(l),.05)&&types('thermistor').some(c=>close(c.value,100)&&seriesWith(c,l)));
 case'forwarddiode':return six&&types('diode').some(d=>r[d.id].current>0&&close(r[d.id].current,5.3/101)&&res.some(c=>close(c.value,100)&&seriesWith(c,d)));
 case'fusepath':return six&&types('fuse').some(f=>close(f.value,1)&&close(mag(f),6/101)&&res.some(c=>close(c.value,100)&&seriesWith(c,f)));
 case'unequalseries':return six&&res.some(b=>close(b.value,200)&&close(mag(b),.02)&&res.some(a=>close(a.value,100)&&seriesWith(a,b))&&types('voltmeter').some(v=>parallel(v,b)&&close(Math.abs(r[v.id].voltage),4)));
 case'unequalparallel':return six&&res.some(a=>close(a.value,100)&&close(mag(a),.06)&&res.some(b=>close(b.value,200)&&close(mag(b),.03)&&parallel(a,b)));
 case'ledswitch':return six&&types('led').some(l=>r[l.id].current>=.005&&r[l.id].current<=.02&&res.some(c=>close(c.value,330)&&seriesWith(c,l))&&switches.some(c=>seriesWith(c,l)));
 case'finalcheck':return measured(300,.02)&&res.some(c=>close(c.value,300)&&types('voltmeter').some(v=>parallel(v,c)&&close(Math.abs(r[v.id].voltage),6)));
 case'master':return controlled&&amp&&volt&&lamps.some(l=>mag(l)>=.02&&mag(l)<=.04&&types('variable').some(v=>seriesWith(v,l)));
 default:return false;}
}
function validate(){const status=$('#missionStatus');if(!status){$('#nextMission').disabled=true;return;}let passed=false;if(mode==='missions'||mode==='challenge'){if(missionPhase==='complete'&&missionPassSignature!==missionSignature()){missionPhase='running';timerOn=true;missionDeadline=Date.now()+remaining*1000;}passed=(missionPhase==='running'||missionPhase==='complete')&&checkMission(mission);if(passed){missionPassSignature=missionSignature();missionPhase='complete';timerOn=false;missionDeadline=null;}passed=passed||mayAdvanceMission();if(passed&&!classroom.completed.includes(mission)){classroom.completed.push(mission);beep();const bar=$('.progress div');if(bar)bar.style.width=classroom.completed.length/missions.length*100+'%';}}
 if(mode==='detective'&&result?.ok&&result.active){const type=detectives[detective][3];passed=type==='reverse-led'?state.components.some(c=>c.type==='led'&&result.readings[c.id].current>=.005&&result.readings[c.id].current<=.02):state.components.some(c=>c.type==='lamp'&&Math.abs(result.readings[c.id].current)>1e-5)&&state.components.some(c=>c.type==='ammeter'&&Math.abs(result.readings[c.id].current)>1e-5);}
 const next=$('#missionNext');if(next)next.disabled=!mayAdvanceMission();$('#nextMission').disabled=!mayAdvanceMission();
 status.textContent=passed?'✓ Circuit verified!':'Build it, then press Run.';status.className=passed?'success':'pending';}
$('#teacher').onclick=()=>{const panel=$('#teacherPanel');panel.hidden=!panel.hidden;$('#teacher').setAttribute('aria-pressed',!panel.hidden);};
function renderTimer(){$('#timer').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');refreshMissionClock();}
$('#timerStart').onclick=beginMission;$('#timerPause').onclick=pauseMission;$('#timerReset').onclick=()=>{if(missionPhase==='expired'){showDance('retry');return;}resetAttempt();changed();renderTimer();};$('#nextMission').onclick=nextMission;$('#previousMission').onclick=backMission;$('#reveal').onclick=showAnswer;

$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'🔊':'🔇';$('#sound').setAttribute('aria-label',sound?'Sound on':'Sound off');$('#sound').setAttribute('aria-pressed',sound);beep();};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('Fullscreen is unavailable in this browser.');}};
// Wire flow uses KCL at each terminal, distributing cycles without inventing meter readings.
function wireCurrents(){if(!result?.ok)return new Map();const keys=state.components.flatMap(c=>[c.id+':0',c.id+':1']),adj=new Map(keys.map(k=>[k,[]])),edges=[...state.wires];for(const c of state.components)if(c.type==='wire'||c.type==='junction')edges.push({id:'internal-'+c.id,a:c.id+':0',b:c.id+':1'});for(const e of edges){adj.get(e.a)?.push(e);adj.get(e.b)?.push(e);}const demand=new Map(keys.map(k=>[k,0]));for(const c of state.components){const i=result.readings[c.id].current||0;demand.set(c.id+':0',-i);demand.set(c.id+':1',i);}const seen=new Set(),flows=new Map();function visit(k){seen.add(k);let total=demand.get(k)||0;for(const e of adj.get(k)){const other=e.a===k?e.b:e.a;if(seen.has(other))continue;const q=visit(other);flows.set(e.id,e.a===k?-q:q);total+=q;}return total;}for(const k of keys)if(!seen.has(k))visit(k);return flows;}
let lastFlow=0;function animate(time){requestAnimationFrame(animate);if(time-lastFlow<70)return;lastFlow=time;const g=$('#flows');g.replaceChildren();if(!running||!result?.ok||$('#flow').value==='none')return;const currents=wireCurrents(),electron=$('#flow').value==='electron';for(const w of state.wires){const i=(currents.get(w.id)||0)*(electron?-1:1);if(Math.abs(i)<1e-8)continue;const pts=wirePoints(w),lens=pts.slice(1).map((p,j)=>Math.hypot(p.x-pts[j].x,p.y-pts[j].y)),total=lens.reduce((a,b)=>a+b,0);if(total<2)continue;for(let offset=0;offset<total;offset+=85){let d=(offset+(time*.035*Math.sign(i))%total+total)%total,j=0;while(j<lens.length-1&&d>lens[j])d-=lens[j++];if(!lens[j])continue;const a=pts[j],b=pts[j+1],f=d/lens[j],x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+(i<0?180:0);g.append(svgNode('path',{d:'M-7 -4L2 0L-7 4Z',transform:`translate(${x},${y}) rotate(${angle})`,class:'flow-arrow'+(electron?' electron':'')}));}}}
try{const saved=JSON.parse(localStorage.getItem('circuitlab-v1'));if(saved&&Array.isArray(saved.state?.components)&&Array.isArray(saved.state?.wires)&&saved.state.components.every(c=>PARTS[c.type]&&typeof c.id==='string'&&Number.isFinite(c.x)&&Number.isFinite(c.y))){state=saved.state;serial=+saved.serial||1000;example=saved.example||'';if(saved.classroom&&Array.isArray(saved.classroom.names)&&Array.isArray(saved.classroom.scores)&&Array.isArray(saved.classroom.completed))classroom=saved.classroom;mission=Math.max(0,Math.min(missions.length-1,+saved.mission||0));detective=Math.max(0,Math.min(2,+saved.detective||0));mode='missions';if(saved.retryLocks&&typeof saved.retryLocks==='object')retryLocks=Object.fromEntries(Object.entries(saved.retryLocks).filter(([k,v])=>Number.isInteger(+k)&&+k>=0&&+k<missions.length&&v===true));classroom.completed=[...new Set(classroom.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<missions.length))];if(saved.attempt&&['ready','running','paused','complete','expired'].includes(saved.attempt.phase)){missionPhase=saved.attempt.phase;remaining=Math.max(0,Math.min(90,+saved.attempt.remaining||0));missionDeadline=Number.isFinite(saved.attempt.deadline)?saved.attempt.deadline:null;if(missionPhase==='running'&&missionDeadline!==null){remaining=Math.max(0,Math.ceil((missionDeadline-Date.now())/1000));timerOn=remaining>0;running=remaining>0;if(!remaining)missionPhase='expired';}else if(missionPhase==='running'){missionPhase='ready';remaining=90;}if(missionPhase==='complete')missionPassSignature=missionSignature();}}}catch{notify('Saved progress could not be loaded. Starting a new board.');}
if(retryLocks[mission]){missionPhase='expired';remaining=0;timerOn=false;running=false;missionDeadline=null;}activity();changed();renderTimer();if(missionPhase==='expired')showDance('retry');requestAnimationFrame(animate);
