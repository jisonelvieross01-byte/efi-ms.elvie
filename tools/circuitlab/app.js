'use strict';
const $=s=>document.querySelector(s), NS='http://www.w3.org/2000/svg';
let state={components:[],wires:[]},selected=null,armed=null,placing=null,tool='select',running=false,result=null,mode='build',mission=0,detective=0,history=[],future=[],serial=0,drag=null,example='',sound=false;
let classroom={names:['Pair 1','Pair 2'],scores:[0,0],completed:[],awarded:[]},remaining=180,timerOn=false;
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
 ['Bring it together','Lamp + switch + ammeter + voltmeter, all correct.','Current is measured in series; potential difference is measured in parallel.','all']
];
const detectives=[['A meter blocks the way','The lamp stays dark. Check the meter.','A voltmeter has infinite resistance. Replace the series voltmeter with an ammeter.','series-meter'],['A dangerous shortcut','The ammeter is across the battery. Fix it.','Never place an ammeter directly across a source. Put it in series with the load.','short-meter'],['The backwards LED','The LED stays dark. Fix its direction.','An LED conducts only from anode to cathode. Reconnect its anode towards the source’s + terminal and its cathode towards −. Rotation changes the drawing, not the attached wire ends.','reverse-led']];
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function beep(){if(!sound)return;try{const ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);g.gain.value=.025;o.frequency.value=660;o.start();o.stop(ac.currentTime+.1);o.onended=()=>ac.close();}catch{}}
function persist(){try{localStorage.setItem('circuitlab-v1',JSON.stringify({state,classroom,mission,detective,mode,serial,example}));$('#saveStatus').textContent='Saved';}catch{$('#saveStatus').textContent='Not saved — keep this tab open';}}
function checkpoint(){history.push(JSON.stringify(state));if(history.length>80)history.shift();future=[];}
function changed(){result=running?CircuitSolver.solve(state):null;renderBoard();renderReadings();validate();persist();$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;}
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
 const start=escape(w.a),end=escape(w.b),sk=key(start.x/10,start.y/10),ek=key(end.x/10,end.y/10),dist=new Map([[sk,0]]),prev=new Map(),heap=[];
 function push(k,f){heap.push({k,f});let i=heap.length-1;while(i>0){let p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}
 function pop(){const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let l=i*2+1,r=l+1,j=i;if(l<heap.length&&heap[l].f<heap[j].f)j=l;if(r<heap.length&&heap[r].f<heap[j].f)j=r;if(j===i)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return top;}
 const heuristic=k=>{const p=point(k);return (Math.abs(p.x-end.x)+Math.abs(p.y-end.y))/10;};push(sk,heuristic(sk));const done=new Set();let found=false;
 while(heap.length){const {k}=pop();if(done.has(k))continue;done.add(k);if(k===ek){found=true;break;}const x=k%W,y=Math.floor(k/W);for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;const nk=key(nx,ny);if(blocked.has(nk)&&nk!==ek)continue;const pk=prev.get(k),turn=pk!==undefined&&((k-pk)!==(nk-k))?6:0;const nd=dist.get(k)+1+turn+(occupied.has(nk)?8:0);if(nd<(dist.get(nk)??Infinity)){dist.set(nk,nd);prev.set(nk,k);push(nk,nd+heuristic(nk));}}}
 let pts;if(found){const rev=[];let k=ek;while(k!==sk){rev.push(point(k));k=prev.get(k);}rev.push(start);pts=[a,...rev.reverse(),b];}else pts=[a,start,{x:start.x,y:end.y},end,b];
 // Keep only bends so arrow animation and SVG paths stay small.
 const compact=[pts[0]];for(let i=1;i<pts.length-1;i++){const p=pts[i-1],q=pts[i],r=pts[i+1];if((q.x-p.x)*(r.y-q.y)!==(q.y-p.y)*(r.x-q.x))compact.push(q);}compact.push(pts.at(-1));routes.set(w.id,compact);
 for(const p of pts)occupied.add(key(Math.round(p.x/10),Math.round(p.y/10)));
 }
}
function wirePath(w){const pts=routes.get(w.id)||[];return pts.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');}
function wirePoints(w){return routes.get(w.id)||[];}
function svgNode(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function fmt(n,unit){return n===null||n===undefined||!Number.isFinite(n)?'Undefined':`${Math.abs(n)<1e-10?0:+n.toPrecision(4)} ${unit}`;}
function renderBoard(){
 routeAll();const wg=$('#wires'),cg=$('#components');wg.replaceChildren();cg.replaceChildren();
 for(const w of state.wires){const g=svgNode('g',{'data-wire':w.id});g.append(svgNode('path',{d:wirePath(w),class:'wire-hit'}),svgNode('path',{d:wirePath(w),class:'wire'+(selected===w.id?' selected':'')}));wg.append(g);}
 for(const c of state.components){const g=svgNode('g',{transform:`translate(${c.x},${c.y})`,'data-part':c.id,class:'part'+(selected===c.id?' selected':'')});
  if(selected===c.id)g.append(svgNode('rect',{x:-66,y:-65,width:132,height:120,rx:12,class:'selection'}));
  const sym=svgNode('g',{transform:`rotate(${c.rotation||0})`});
  const rr=result?.ok?result.readings[c.id]:null;if(c.type==='lamp'&&rr&&rr.power>1e-8||c.type==='led'&&rr&&rr.current>1e-5){sym.append(svgNode('circle',{r:c.type==='lamp'?28:23,fill:'#ffb632',opacity:Math.min(.85,Math.max(.1,(rr.power||0)/1.8)),stroke:'none'}));}
  const shape=svgNode('g');shape.innerHTML=symbol(c.type,c.closed);sym.append(shape);g.append(sym);
  const label=svgNode('text',{y:48,'text-anchor':'middle',class:'part-label'});label.textContent=PARTS[c.type].name+(c.value!==undefined?' · '+c.value+' '+PARTS[c.type].unit:'');g.append(label);
  for(let t=0;t<2;t++){const p=terminal(c,t);const hit=svgNode('circle',{cx:p.x-c.x,cy:p.y-c.y,r:24,fill:'transparent','data-terminal':c.id+':'+t});g.append(hit);g.append(svgNode('circle',{cx:p.x-c.x,cy:p.y-c.y,r:7,class:'terminal'+(armed===c.id+':'+t?' armed':''),'data-terminal':c.id+':'+t}));}
  cg.append(g);
 }
 $('#empty').hidden=!!state.components.length;
 $('#selectTool').classList.toggle('active',tool==='select'&&!placing);$('#wireTool').classList.toggle('active',tool==='wire');
 document.querySelectorAll('#parts button').forEach(b=>b.classList.toggle('active',b.dataset.type===placing));
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
 if(!c){box.innerHTML='<h3>Settings</h3><p>Tap a part to change it.</p>';return;}
 const p=PARTS[c.type],h=document.createElement('h3');h.textContent=p.name;const info=document.createElement('p');info.textContent=p.info;box.append(h,info);
 if(p.range){const l=document.createElement('label');l.textContent=`${c.type==='cell'||c.type==='battery'||c.type==='supply'?'Voltage':'Resistance'}: ${c.value} ${p.unit}`;const input=document.createElement('input');input.type='range';[input.min,input.max,input.step]=p.range;input.value=c.value;input.setAttribute('aria-label',p.name+' '+p.unit);input.onpointerdown=()=>checkpoint();input.onkeydown=e=>{if(e.key.startsWith('Arrow'))checkpoint();};input.oninput=()=>{c.value=+input.value;l.firstChild.textContent=`${p.unit==='V'?'Voltage':'Resistance'}: ${c.value} ${p.unit}`;result=running?CircuitSolver.solve(state):null;renderBoard();validate();persist();};input.onchange=changed;l.append(input);box.append(l);}
 if(c.type==='switch'){const b=document.createElement('button');b.textContent=c.closed?'On · tap to turn off':'Off · tap to turn on';b.onclick=()=>{checkpoint();c.closed=!c.closed;changed();};box.append(b);}
 if(c.type==='fuse'){const b=document.createElement('button');b.textContent=c.blown?'Open fuse · restore':'Open fuse manually';b.onclick=()=>{checkpoint();c.blown=!c.blown;changed();};box.append(b);}
 const r=result?.ok?result.readings[c.id]:null;if(r){const reading=document.createElement('p');reading.textContent=`ΔV = ${fmt(r.voltage,'V')} · I = ${fmt(r.current,'A')} · P = ${fmt(r.power,'W')}`;box.append(reading);}
}
function point(ev){const p=$('#board').createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;return p.matrixTransform($('#board').getScreenCTM().inverse());}
function snap(n,min,max){return Math.max(min,Math.min(max,Math.round(n/20)*20));}
function addAt(type,p){checkpoint();const c=part(type,snap(p.x,80,1120),snap(p.y,80,680));state.components.push(c);selected=c.id;placing=null;armed=null;changed();beep();}
$('#board').addEventListener('pointerdown',ev=>{
 if(ev.button!==0)return;ev.preventDefault();const p=point(ev),term=ev.target.closest('[data-terminal]'),pe=ev.target.closest('[data-part]'),we=ev.target.closest('[data-wire]');
 if(term){const key=term.dataset.terminal;if(armed&&armed!==key){if(!state.wires.some(w=>w.a===armed&&w.b===key||w.b===armed&&w.a===key)){checkpoint();state.wires.push({id:'w'+(++serial),a:armed,b:key});}armed=null;changed();beep();}else{armed=armed===key?null:key;renderBoard();}return;}
 if(placing){addAt(placing,p);return;}
 if(we){selected=we.dataset.wire;armed=null;renderBoard();renderInspector();return;}
 if(pe){selected=pe.dataset.part;renderBoard();renderInspector();if(tool==='select'){const c=state.components.find(c=>c.id===selected);drag={id:c.id,start:p,x:c.x,y:c.y,moved:false,snapshot:JSON.stringify(state)};$('#board').setPointerCapture(ev.pointerId);}return;}
 selected=null;armed=null;renderBoard();renderInspector();
});
$('#board').addEventListener('pointermove',ev=>{if(!drag)return;const p=point(ev),c=state.components.find(c=>c.id===drag.id);if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>6)drag.moved=true;if(drag.moved){c.x=snap(drag.x+p.x-drag.start.x,80,1120);c.y=snap(drag.y+p.y-drag.start.y,80,680);renderBoard();}});
function endDrag(){if(drag?.moved){history.push(drag.snapshot);future=[];changed();}drag=null;}
$('#board').addEventListener('pointerup',endDrag);$('#board').addEventListener('pointercancel',endDrag);
$('#board').addEventListener('dblclick',ev=>{const c=state.components.find(c=>c.id===ev.target.closest('[data-part]')?.dataset.part);if(c?.type==='switch'){checkpoint();c.closed=!c.closed;changed();}});
$('#board').addEventListener('dragover',ev=>ev.preventDefault());$('#board').addEventListener('drop',ev=>{ev.preventDefault();const t=ev.dataTransfer.getData('text/plain');if(PARTS[t])addAt(t,point(ev));});
for(const [type,p] of Object.entries(PARTS)){const b=document.createElement('button');b.dataset.type=type;b.innerHTML=icon(type)+'<span>'+p.name+'</span>';b.title=p.info;b.draggable=true;b.onclick=()=>{if(mode==='explorer'){showSymbol(type);return;}placing=placing===type?null:type;armed=null;tool='select';renderBoard();notify('Now tap the board');};b.ondragstart=ev=>ev.dataTransfer.setData('text/plain',type);$('#parts').append(b);}
function rotate(){const c=state.components.find(c=>c.id===selected);if(c){checkpoint();c.rotation=((c.rotation||0)+90)%360;changed();}}
function remove(){if(!selected)return;checkpoint();state.components=state.components.filter(c=>c.id!==selected);state.wires=state.wires.filter(w=>w.id!==selected&&!w.a.startsWith(selected+':')&&!w.b.startsWith(selected+':'));selected=null;armed=null;changed();}
$('#rotate').onclick=rotate;$('#delete').onclick=remove;$('#clear').onclick=()=>{checkpoint();state={components:[],wires:[]};selected=armed=null;changed();};
$('#undo').onclick=()=>{if(history.length){future.push(JSON.stringify(state));state=JSON.parse(history.pop());selected=armed=null;changed();}};
$('#redo').onclick=()=>{if(future.length){history.push(JSON.stringify(state));state=JSON.parse(future.pop());selected=armed=null;changed();}};
$('#selectTool').onclick=()=>{tool='select';placing=null;armed=null;renderBoard();};$('#wireTool').onclick=()=>{tool='wire';placing=null;renderBoard();notify('Tap one dot, then another');};
$('#run').onclick=()=>{running=true;changed();};$('#pause').onclick=()=>{running=false;timerOn=false;changed();};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){placing=armed=null;renderBoard();}if(e.key.toLowerCase()==='r')rotate();if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'#redo':'#undo').click();}});
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
function load(name){checkpoint();state=makeExample(name);example=name;selected=armed=null;running=true;changed();}
$('#examples').onchange=e=>{if(e.target.value)load(e.target.value);};$('#reset').onclick=()=>{if(example)load(example);else{$('#clear').click();}};
function showSymbol(type){$('#symbolDetail').innerHTML=icon(type)+'<h2>'+PARTS[type].name+'</h2><p>'+PARTS[type].info+'</p>';$('#symbolDialog').showModal();}$('#closeDialog').onclick=()=>$('#symbolDialog').close();
let quizType='';function quiz(){const keys=Object.keys(PARTS);quizType=keys[Math.floor(Math.random()*keys.length)];const choices=[quizType,...keys.filter(t=>t!==quizType).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);const box=$('#explorerPanel');box.innerHTML='<h2>Which symbol is this?</h2><svg class="quiz-symbol" viewBox="-60 -55 120 100">'+symbol(quizType)+'</svg><div id="quizChoices"></div><p id="quizAnswer" role="status">Choose its name.</p>';for(const t of choices){const b=document.createElement('button');b.textContent=PARTS[t].name;b.onclick=()=>{const correct=t===quizType;$('#quizAnswer').textContent=correct?'Correct! '+PARTS[t].info:'Not quite. Try again.';if(correct){beep();if(!$('#nextQuiz')){const n=document.createElement('button');n.id='nextQuiz';n.textContent='Next symbol';n.onclick=quiz;box.append(n);}}};$('#quizChoices').append(b);}}
function activity(){const a=$('#activity');a.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');a.append(h,p);$('#explorerPanel').hidden=mode!=='explorer';
 if(mode==='build'){h.textContent='Free build';p.textContent='Add parts → join the dots → press Run.';}
 if(mode==='explorer'){h.textContent='Symbols';p.textContent='Tap a part to learn it. Then try the quiz.';quiz();}
 if(mode==='missions'||mode==='challenge'){const m=missions[mission];h.textContent=`Mission ${mission+1}/10 · ${m[0]}`;p.textContent=m[1];const progress=document.createElement('div');progress.className='progress';progress.innerHTML='<div style="width:'+classroom.completed.length*10+'%"></div>';a.append(progress);const status=document.createElement('span');status.id='missionStatus';a.append(status);const next=document.createElement('button');next.textContent='Next →';next.onclick=nextMission;a.append(next);if(mode==='challenge')scoreboard(a);}
 if(mode==='detective'){const d=detectives[detective];h.textContent=`Case ${detective+1}/3 · ${d[0]}`;p.textContent=d[1];const status=document.createElement('span');status.id='missionStatus';a.append(status);const b=document.createElement('button');b.textContent='Restart';b.onclick=()=>load(d[3]);const next=document.createElement('button');next.textContent='Next case →';next.className='primary';next.onclick=()=>{detective=(detective+1)%detectives.length;load(detectives[detective][3]);activity();};a.append(b,next);}
 document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));validate();
}
function nextMission(){mission=(mission+1)%missions.length;$('#explanation').hidden=true;remaining=+$('#minutes').value*60;timerOn=false;renderTimer();activity();persist();}
$('#modes').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b)return;mode=b.dataset.mode;placing=armed=null;if(mode==='detective')load(detectives[detective][3]);activity();renderBoard();persist();};
function scoreboard(a){const controls=document.createElement('label');controls.textContent='Participants ';const count=document.createElement('input');count.type='number';count.min=1;count.max=20;count.value=classroom.names.length;count.style.width='70px';count.onchange=()=>{const n=Math.min(20,Math.max(1,+count.value||1));while(classroom.names.length<n){classroom.names.push('Pair '+(classroom.names.length+1));classroom.scores.push(0);}classroom.names.length=n;classroom.scores.length=n;activity();persist();};controls.append(count);a.append(controls);const table=document.createElement('table');table.className='scoreboard';table.innerHTML='<thead><tr><th>Student / pair</th><th>Points</th><th>Teacher awards</th></tr></thead>';const tbody=document.createElement('tbody');classroom.names.forEach((name,i)=>{const tr=document.createElement('tr'),td=document.createElement('td'),inp=document.createElement('input');inp.type='text';inp.maxLength=40;inp.value=name;inp.setAttribute('aria-label','Participant '+(i+1));inp.onchange=()=>{classroom.names[i]=inp.value;persist();};td.append(inp);const score=document.createElement('td');score.textContent=classroom.scores[i];const actions=document.createElement('td');for(const delta of [10,-10]){const b=document.createElement('button');b.textContent=delta>0?'+10':'−10';b.setAttribute('aria-label',(delta>0?'Award':'Remove')+' 10 points for participant '+(i+1));b.onclick=()=>{classroom.scores[i]=Math.max(0,classroom.scores[i]+delta);activity();persist();};actions.append(b);}tr.append(td,score,actions);tbody.append(tr);});table.append(tbody);a.append(table);const p=document.createElement('p');p.className='micro';p.textContent='Give each pair the mission. Check it, then award points.';a.append(p);const reset=document.createElement('button');reset.textContent='Reset scores';reset.onclick=()=>{classroom.scores.fill(0);activity();persist();};a.append(reset);}
function checkMission(index){if(!result?.ok||!result.active)return false;const r=result.readings,cs=state.components,n=result.nodes;const types=t=>cs.filter(c=>c.type===t),live=c=>Math.abs(r[c.id].current)>1e-7,lamps=types('lamp').filter(live),switches=types('switch').filter(c=>c.closed),res=types('resistor');
 const pair=c=>[n[c.id+':0'],n[c.id+':1']],parallel=(a,b)=>{const x=pair(a),y=pair(b);return x[0]===y[0]&&x[1]===y[1]||x[0]===y[1]&&x[1]===y[0];};
 // Remove the selected branch to prove it lies in a necessary series path.
 const seriesWith=(a,b)=>{if(!live(a)||!live(b)||Math.abs(Math.abs(r[a.id].current)-Math.abs(r[b.id].current))>1e-6)return false;const copy=JSON.parse(JSON.stringify(state));copy.components=copy.components.filter(c=>c.id!==a.id);copy.wires=copy.wires.filter(w=>!w.a.startsWith(a.id+':')&&!w.b.startsWith(a.id+':'));const s=CircuitSolver.solve(copy);return s.ok&&Math.abs(s.readings[b.id]?.current||0)<1e-8;};
 const controlled=lamps.some(l=>switches.some(s=>{const copy=JSON.parse(JSON.stringify(state));copy.components.find(c=>c.id===s.id).closed=false;const out=CircuitSolver.solve(copy);return out.ok&&Math.abs(out.readings[l.id].current)<1e-8;}));
 const amp=lamps.some(l=>types('ammeter').some(a=>seriesWith(a,l))),volt=lamps.some(l=>types('voltmeter').some(v=>parallel(v,l)&&Math.abs(r[v.id].voltage)>1e-7));
 const six=cs.some(c=>['battery','cell','supply'].includes(c.type)&&Math.abs(c.value-6)<1e-7);
 switch(missions[index][3]){case'lamp':return !!lamps.length;case'switch':return controlled;case'ammeter':return amp;case'voltmeter':return volt;case'series':return six&&res.some(a=>a.value===100&&res.some(b=>a!==b&&b.value===100&&seriesWith(a,b)&&Math.abs(Math.abs(r[a.id].current)-.03)<1e-6));case'parallel':return six&&res.some(a=>a.value===100&&res.some(b=>a!==b&&b.value===100&&parallel(a,b)&&Math.abs(Math.abs(r[a.id].current)-.06)<1e-6));case'variable':return lamps.some(l=>Math.abs(r[l.id].current)>=.02&&Math.abs(r[l.id].current)<=.04&&types('variable').some(v=>seriesWith(v,l)));case'led':return types('led').some(l=>r[l.id].current>=.005&&r[l.id].current<=.02&&res.some(v=>seriesWith(v,l)));case'sensor':return lamps.some(l=>[...types('ldr'),...types('thermistor')].some(s=>seriesWith(s,l)));case'all':return controlled&&amp&&volt;default:return false;}
}
function validate(){const status=$('#missionStatus');if(!status)return;let passed=false;if(mode==='missions'||mode==='challenge'){passed=checkMission(mission);if(passed&&!classroom.completed.includes(mission)){classroom.completed.push(mission);beep();const bar=$('.progress div');if(bar)bar.style.width=classroom.completed.length*10+'%';}}
 if(mode==='detective'&&result?.ok&&result.active){const type=detectives[detective][3];passed=type==='reverse-led'?state.components.some(c=>c.type==='led'&&result.readings[c.id].current>=.005&&result.readings[c.id].current<=.02):state.components.some(c=>c.type==='lamp'&&Math.abs(result.readings[c.id].current)>1e-5)&&state.components.some(c=>c.type==='ammeter'&&Math.abs(result.readings[c.id].current)>1e-5);}
 status.textContent=passed?'✓ Circuit verified!':'Build it, then press Run.';status.className=passed?'success':'pending';}
$('#teacher').onclick=()=>{const panel=$('#teacherPanel');panel.hidden=!panel.hidden;$('#teacher').setAttribute('aria-pressed',!panel.hidden);};
function renderTimer(){$('#timer').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');}
$('#minutes').onchange=()=>{const v=Math.max(1,Math.min(60,+$('#minutes').value||3));$('#minutes').value=v;remaining=v*60;timerOn=false;renderTimer();};$('#timerStart').onclick=()=>{if(remaining<=0)remaining=+$('#minutes').value*60;timerOn=true;running=true;changed();};$('#timerPause').onclick=()=>{timerOn=false;running=false;changed();};$('#timerReset').onclick=()=>{timerOn=false;remaining=+$('#minutes').value*60;renderTimer();};$('#nextMission').onclick=nextMission;$('#reveal').onclick=()=>{$('#explanation').hidden=false;$('#explanation').textContent=mode==='detective'?detectives[detective][2]:missions[mission][2];};
setInterval(()=>{if(timerOn&&remaining>0){remaining--;renderTimer();if(!remaining){timerOn=false;notify('Time is up!');beep();}}},1000);
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'🔊':'🔇';$('#sound').setAttribute('aria-label',sound?'Sound on':'Sound off');$('#sound').setAttribute('aria-pressed',sound);beep();};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('Fullscreen is unavailable in this browser.');}};
// Wire flow uses KCL at each terminal, distributing cycles without inventing meter readings.
function wireCurrents(){if(!result?.ok)return new Map();const keys=state.components.flatMap(c=>[c.id+':0',c.id+':1']),adj=new Map(keys.map(k=>[k,[]])),edges=[...state.wires];for(const c of state.components)if(c.type==='wire'||c.type==='junction')edges.push({id:'internal-'+c.id,a:c.id+':0',b:c.id+':1'});for(const e of edges){adj.get(e.a)?.push(e);adj.get(e.b)?.push(e);}const demand=new Map(keys.map(k=>[k,0]));for(const c of state.components){const i=result.readings[c.id].current||0;demand.set(c.id+':0',-i);demand.set(c.id+':1',i);}const seen=new Set(),flows=new Map();function visit(k){seen.add(k);let total=demand.get(k)||0;for(const e of adj.get(k)){const other=e.a===k?e.b:e.a;if(seen.has(other))continue;const q=visit(other);flows.set(e.id,e.a===k?-q:q);total+=q;}return total;}for(const k of keys)if(!seen.has(k))visit(k);return flows;}
let lastFlow=0;function animate(time){requestAnimationFrame(animate);if(time-lastFlow<70)return;lastFlow=time;const g=$('#flows');g.replaceChildren();if(!running||!result?.ok||$('#flow').value==='none')return;const currents=wireCurrents(),electron=$('#flow').value==='electron';for(const w of state.wires){const i=(currents.get(w.id)||0)*(electron?-1:1);if(Math.abs(i)<1e-8)continue;const pts=wirePoints(w),lens=pts.slice(1).map((p,j)=>Math.hypot(p.x-pts[j].x,p.y-pts[j].y)),total=lens.reduce((a,b)=>a+b,0);if(total<2)continue;for(let offset=0;offset<total;offset+=85){let d=(offset+(time*.035*Math.sign(i))%total+total)%total,j=0;while(j<lens.length-1&&d>lens[j])d-=lens[j++];if(!lens[j])continue;const a=pts[j],b=pts[j+1],f=d/lens[j],x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+(i<0?180:0);g.append(svgNode('path',{d:'M-7 -4L2 0L-7 4Z',transform:`translate(${x},${y}) rotate(${angle})`,class:'flow-arrow'+(electron?' electron':'')}));}}}
try{const saved=JSON.parse(localStorage.getItem('circuitlab-v1'));if(saved&&Array.isArray(saved.state?.components)&&Array.isArray(saved.state?.wires)&&saved.state.components.every(c=>PARTS[c.type]&&typeof c.id==='string'&&Number.isFinite(c.x)&&Number.isFinite(c.y))){state=saved.state;serial=+saved.serial||1000;example=saved.example||'';if(saved.classroom&&Array.isArray(saved.classroom.names)&&Array.isArray(saved.classroom.scores)&&Array.isArray(saved.classroom.completed))classroom=saved.classroom;mission=Math.max(0,Math.min(9,+saved.mission||0));detective=Math.max(0,Math.min(2,+saved.detective||0));if(['build','missions','explorer','detective','challenge'].includes(saved.mode))mode=saved.mode;}}catch{notify('Saved progress could not be loaded. Starting a new board.');}
activity();changed();requestAnimationFrame(animate);
