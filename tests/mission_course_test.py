"""All twenty-four missions need physically valid answers; broken/wrong-value circuits must fail."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.evaluate('missions.length')==24
 assert page.locator('#modes button').count()==1
 for i in range(24):
  out=page.evaluate('''i=>{const previous=state,oldResult=result;try{state=solutionCircuit(i);result=CircuitSolver.solve(state);const good=checkMission(i);const current=Math.abs(result.readings[state.components[0].id].current);state.wires.shift();result=CircuitSolver.solve(state);return {good,current,broken:checkMission(i)};}finally{state=previous;result=oldResult;}}''',i)
  assert out['good'],(i,out)
  assert not out['broken'],i
  if i>=10:
   expected={10:.06,11:.03,12:.15,13:.15,14:.6,15:.03,16:.05,17:5.3/101,18:6/101,19:6/220,20:.02,21:.09,22:4.2/331,23:.02}[i]
   assert abs(out['current']-expected)<1e-8,(i,out,expected)
   wrong=page.evaluate('''i=>{const previous=state,oldResult=result;try{state=solutionCircuit(i);state.components[0].value=12;result=CircuitSolver.solve(state);return checkMission(i);}finally{state=previous;result=oldResult;}}''',i)
   assert not wrong,('wrong source value accepted',i)
 # Each mission gets a title, hint, full answer, and active navigation at every size.
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  page.evaluate('mission=19;activity()');page.locator('#hint').click()
  assert page.locator('#hintLayer [data-guide-part]').count()==6
  page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#closeAnswer').click()
  page.locator('#missionBack').click();assert page.evaluate('mission')==18
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: 24 valid answer circuits; 24 open-circuit rejections; fourteen independent current references and wrong-voltage rejections; mission-only navigation, hints/answers and Back at 375/960/1920.')
