"""Verify every answer against the real solver/mission validator, and guides never solve for students."""
from pathlib import Path
from answer_gate_helpers import approve_answer
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('[data-mode="missions"]').click()
 # All twenty-four solutions pass the actual mission checks, without marking progress.
 for i in range(24):
  assert page.evaluate('''i=>{const oldState=state,oldResult=result;try{state=solutionCircuit(i);result=CircuitSolver.solve(state);return result.ok&&result.active&&checkMission(i);}finally{state=oldState;result=oldResult;}}''',i),i
 for i in range(24):
  page.evaluate('(i)=>{mission=i;activity()}',i)
  before=page.evaluate('JSON.stringify({state,serial,history,future,classroom,saved:localStorage.getItem("circuitlab-v1")})')
  assert page.locator('#activity button').count()==2
  page.locator('#hint').tap()
  assert page.locator('#hintLayer [data-guide-part]').count()>=2
  assert page.locator('#hintLayer .guide-wire').count()==1
  assert page.locator('#empty').is_hidden()
  approve_answer(page)
  assert page.locator('#answerDialog').is_visible()
  assert page.locator('#answerDrawing .guide-wire').count()==page.evaluate('solutionCircuit(mission).wires.length')
  assert page.locator('#answerConnections li').count()==page.evaluate('solutionCircuit(mission).wires.length')
  assert page.locator('#answerDrawing .guide-terminal-label').count()==page.evaluate('solutionCircuit(mission).components.length*2')
  if i==9:page.screenshot(path='/tmp/circuitlab-answer.png',full_page=True)
  page.locator('#closeAnswer').tap()
  assert page.evaluate('JSON.stringify({state,serial,history,future,classroom,saved:localStorage.getItem("circuitlab-v1")})')==before
  assert 'verified' not in page.locator('#missionStatus').inner_text()
  assert page.locator('#missionNext').is_disabled()
  page.evaluate('state=solutionCircuit(mission);beginMission();running=true;changed()')
  assert page.locator('#missionNext').is_enabled()
  page.locator('#missionNext').click();assert page.locator('#hintLayer [data-guide-part]').count()==0
  assert page.evaluate('state.components.length===0 && state.wires.length===0')
 # Hint survives edits but does not block wiring/selecting; modes clear it.
 page.locator('#hint').tap();page.evaluate("addAt('lamp',{x:650,y:180})")
 assert page.locator('#hintLayer [data-guide-part]').count()>0
 assert page.locator('#components [data-part]').count()==1
 page.evaluate('mission=1;activity()');page.locator('#missionBack').click()
 assert page.locator('#hintLayer [data-guide-part]').count()==0
 assert page.locator('#missionBack').is_enabled()
 page.locator('#teacher').click();approve_answer(page,'#reveal')
 assert page.locator('#answerDialog').is_visible();assert page.locator('#explanation').is_visible()
 page.locator('#closeAnswer').click()
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  approve_answer(page)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#closeAnswer').is_visible();page.locator('#closeAnswer').click()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: all twenty-four answer circuits validate; partial hints/full labelled diagrams; no state, history, score or save changes; task resets, teacher reveal and 375/960/1920 layouts.')
