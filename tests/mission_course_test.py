from answer_gate_helpers import unlock_help
"""One teacher demonstration plus 24 simple, topologically validated symbol tasks."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.evaluate('missions.length')==25
 assert 'Teacher demo' in page.locator('#activity').inner_text()
 assert page.locator('#missionClock').inner_text()=='02:00'
 assert page.locator('#parts button').count()==17
 assert page.evaluate('state.components.length===2 && state.wires.length===1')
 assert page.locator('#modes button').count()==1
 for i in range(25):
  result=page.evaluate('''i=>{const old=state,previous=result;try{state=solutionCircuit(i);result=CircuitSolver.solve(state);const valid=checkMission(i),active=result.active;state.wires.shift();result=CircuitSolver.solve(state);return {valid,active,broken:checkMission(i)};}finally{state=old;result=previous;}}''',i)
  assert result['valid'],(i,result)
  assert not result['broken'],(i,result)
  assert result['active']==(i not in [4,17]),(i,result)
  page.evaluate('(i)=>{mission=i;activity()}',i)
  before=page.evaluate('JSON.stringify({state,classroom,history,future})')
  unlock_help(page)
  page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
  assert page.locator('#answerDrawing [data-guide-part]').count()==page.evaluate('solutionCircuit(mission).components.length')
  assert page.evaluate('JSON.stringify({state,classroom,history,future})')==before
  page.locator('#closeAnswer').click()
 # No numerical targets in questions, no settings sliders for students.
 assert page.evaluate('missions.every(m=>!/[0-9].*(Ω|mA| A| V)/.test(m[1]))')
 for type in ['cell','battery','resistor','variable','thermistor','ldr']:
  page.evaluate('(type)=>{const c=part(type,650,380);state.components=[c];state.wires=[];selected=c.id;changed()}',type)
  assert page.locator('#inspector input').count()==0,type
 # Basic recognition tasks accept different safe preset values; no exact current target is needed.
 assert page.evaluate('(()=>{const old=state,previous=result;try{state=solutionCircuit(6);state.components.find(c=>c.type==="resistor").value=200;result=CircuitSolver.solve(state);return checkMission(6)}finally{state=old;result=previous}})()')
 # Old dance/PIN/permission controls and external resources are absent.
 assert page.locator('#danceDialog,#teacherPinDialog,#approvalPin,#continueDance').count()==0
 assert page.evaluate('typeof CircuitDance')=='undefined'
 assert not list((ROOT/'dist').rglob('*.glb')) and not list((ROOT/'dist').rglob('*.bvh'))
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900});page.evaluate('mission=24;activity()')
  unlock_help(page)
  page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#closeAnswer').click()
 assert not errors,errors
 assert all('127.0.0.1' in u or not u.startswith('http') for u in requests)
 browser.close()
server.shutdown()
print('PASS: 25 simple questions, teacher demo, 25 correct/25 broken diagrams, open-switch/capacitor cases, instant answers, no sliders/number targets/dances, and 3 layouts.')
