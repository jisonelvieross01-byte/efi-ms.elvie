"""Mission advancement requires a verified circuit and clears only the board on transition."""
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
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('[data-mode="missions"]').click()
 assert page.locator('#activity button').count()==2
 assert page.locator('#missionNext').is_disabled()
 assert page.locator('#nextMission').is_disabled()
 page.evaluate('nextMission()');assert page.evaluate('mission')==0
 # Hints/answers do not count as completing a mission.
 page.locator('#hint').click();page.locator('#showAnswer').click();page.locator('#closeAnswer').click()
 assert page.locator('#missionNext').is_disabled()
 # Verify, pause, edit: pause keeps success; an invalid edit locks Next again.
 page.select_option('#examples','single');assert page.locator('#missionNext').is_enabled()
 page.locator('#pause').click();assert page.locator('#missionNext').is_enabled()
 page.evaluate('checkpoint();state.wires.pop();changed()')
 assert page.locator('#missionNext').is_disabled()
 page.evaluate('nextMission()');assert page.evaluate('mission')==0
 page.locator('#undo').click();assert page.locator('#missionNext').is_enabled()
 # Next clears the circuit, interaction state, timer, selection and history, keeping achievements.
 page.evaluate("classroom.names=['Ada'];classroom.scores=[20];remaining=12;timerOn=true")
 page.locator('#missionNext').tap()
 assert page.evaluate('mission')==1
 assert page.evaluate('state.components.length===0 && state.wires.length===0')
 assert page.evaluate('history.length===0 && future.length===0 && selected===null && armed===null && example===""')
 assert page.evaluate('!running && !timerOn && remaining===180')
 assert page.evaluate('classroom.scores[0]')==20
 assert page.evaluate('classroom.completed.includes(0)')
 assert page.locator('#missionNext').is_disabled()
 assert page.locator('#undo').is_disabled()
 page.reload();assert page.evaluate('mission')==1
 assert page.evaluate('state.components.length===0 && state.wires.length===0')
 # Validate all ten real solutions, advancing with the same teacher/student guard.
 page.locator('#teacher').click()
 for i in range(1,20):
  assert page.evaluate('mission')==i
  assert page.locator('#nextMission').is_disabled()
  page.evaluate('state=solutionCircuit(mission);running=true;changed()')
  assert 'verified' in page.locator('#missionStatus').inner_text()
  assert page.locator('#missionNext').is_enabled()
  assert page.locator('#nextMission').is_enabled()
  page.locator('#nextMission').click()
  assert page.evaluate('state.components.length===0 && state.wires.length===0')
  assert page.locator('#missionNext').is_disabled()
 assert page.evaluate('mission')==0
 assert page.evaluate('classroom.completed.length')==20
 # Back is always enabled, including unfinished tasks; the first boundary is a safe no-op.
 assert page.locator('#missionBack').is_enabled()
 page.locator('#missionBack').click();assert page.evaluate('mission')==0
 page.evaluate('mission=12;activity()');assert page.locator('#missionNext').is_disabled()
 page.locator('#missionBack').tap();assert page.evaluate('mission')==11
 assert page.evaluate('state.components.length===0 && state.wires.length===0')
 page.locator('#previousMission').click();assert page.evaluate('mission')==10
 assert page.locator('#missionNext').is_disabled()
 assert page.locator('#modes button').count()==1
 assert page.locator('#modes button').inner_text()=='Mission'
 # Saved legacy modes migrate to missions; later mission indices survive reload.
 page.evaluate('mission=19;persist();const saved=JSON.parse(localStorage.getItem("circuitlab-v1"));saved.mode="challenge";localStorage.setItem("circuitlab-v1",JSON.stringify(saved))')
 page.reload();assert page.evaluate('mode')=='missions';assert page.evaluate('mission')==19
 assert page.locator('#missionBack').is_enabled()
 assert page.locator('#missionNext').is_disabled()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: incomplete missions lock student/teacher Next; hints do not unlock; pause/edits/history handled; all twenty verified transitions clear board and preserve scores/progress; Back, mission-only navigation and legacy save migration work.')
