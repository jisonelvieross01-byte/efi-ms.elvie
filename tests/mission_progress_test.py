from answer_gate_helpers import unlock_help
"""All 25 symbol questions gate Next, allow Back, and preserve progress on reload."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
from completion_helpers import auto_dismiss_completion
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 auto_dismiss_completion(page)
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.locator('#missionNext').is_disabled();assert page.locator('#missionBack').is_enabled()
 page.evaluate('nextMission()');assert page.evaluate('mission')==0
 unlock_help(page)
 page.locator('#showAnswer').click();page.locator('#closeAnswer').click();assert page.locator('#missionNext').is_disabled()
 for i in range(25):
  assert page.evaluate('mission')==i
  assert page.locator('#missionNext').is_disabled()
  page.evaluate('state=solutionCircuit(mission);beginMission();changed()')
  assert 'verified' in page.locator('#missionStatus').inner_text()
  assert page.locator('#missionNext').is_enabled()
  page.locator('#missionNext').click()
  assert page.evaluate('remaining')==120
  assert page.evaluate('state.components.length')==(2 if i==24 else 0)
 assert page.evaluate('classroom.completed.length')==25
 page.evaluate('startMission(24)');assert page.locator('#missionBack').is_enabled()
 page.locator('#missionBack').click();assert page.evaluate('mission')==23
 assert page.locator('#missionNext').is_disabled()
 page.reload();assert page.evaluate('mission')==23
 assert page.evaluate('classroom.completed.length')==25
 assert page.locator('#missionNext').is_disabled()
 # A saved old numeric course is backed up rather than miscounted as new symbol tasks.
 page.evaluate('const old={state:{components:[],wires:[]},mission:19,classroom:{completed:[1,2]},attempt:{phase:"expired",remaining:0},retryLocks:{19:true}};localStorage.setItem("circuitlab-v1",JSON.stringify(old))')
 page.reload();assert page.evaluate('mission')==0
 assert page.evaluate('classroom.completed.length')==0
 assert page.evaluate('remaining')==120
 assert page.evaluate('!!localStorage.getItem("circuitlab-previous-course-v1")')
 assert page.evaluate('state.components.length===2 && state.wires.length===1')
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: all 25 gated transitions, clean student boards, teacher demo preparation, unrestricted Back, progress reload and safe old-course migration.')
