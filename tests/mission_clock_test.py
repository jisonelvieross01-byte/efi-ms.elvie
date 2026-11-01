"""Ninety seconds per attempt, explicit Start, accurate reload, and teacher-approved retry."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from answer_gate_helpers import setup_teacher_pin,TEST_PIN
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1920,'height':1080});page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 setup_teacher_pin(page)
 def approve_retry():
  page.clock.fast_forward(3100);page.locator('#approvalPin').fill(TEST_PIN);page.locator('#approveDance').click()
  expect(page.locator('#danceDialog')).not_to_be_visible()
  assert page.evaluate('missionPhase')=='ready';assert page.locator('#answerDialog').is_hidden()
 assert page.locator('#missionStart').is_visible();assert page.locator('#missionClock').inner_text()=='01:30'
 assert page.locator('#run').is_disabled()
 page.clock.fast_forward(120000);assert page.evaluate('remaining')==90;assert not page.evaluate('timerOn')
 page.locator('#missionStart').click();assert page.evaluate('timerOn && missionPhase==="running"')
 assert page.locator('#missionStartOverlay').is_hidden()
 page.clock.fast_forward(89500);assert page.evaluate('remaining')==1;assert page.locator('#danceDialog').is_hidden()
 move=page.evaluate('DANCE_MOVES[danceAssignments[mission]].css')
 page.clock.fast_forward(600)
 assert page.evaluate('missionPhase')=='expired';assert page.evaluate('remaining')==0
 assert page.locator('#danceDialog').is_visible();assert page.evaluate('danceRequest.purpose')=='retry'
 assert page.locator('#danceFigure').get_attribute('data-move')==move
 assert page.locator('#approveDance').is_disabled();assert page.locator('#missionNext').is_disabled()
 page.locator('#cancelDance').click();assert page.locator('#run').is_disabled()
 page.locator('#missionStart').click();assert page.locator('#danceFigure').get_attribute('data-move')==move
 approve_retry();assert page.locator('#missionClock').inner_text()=='01:30'
 assert page.locator('#missionNext').is_disabled()
 # A new attempt keeps the student's work but requires a fresh Start.
 page.evaluate("state={components:[part('lamp',650,300)],wires:[]};changed()")
 before=page.evaluate('JSON.stringify(state)')
 page.locator('#missionStart').click();page.clock.fast_forward(90010)
 assert page.evaluate('JSON.stringify(state)')==before
 approve_retry();assert page.evaluate('JSON.stringify(state)')==before
 assert page.evaluate('classroom.completed.length')==0
 # Completed circuits stop the clock and do not incur a retry movement.
 page.evaluate('state=solutionCircuit(mission);changed()');page.locator('#missionStart').click()
 assert page.evaluate('missionPhase')=='complete';assert not page.evaluate('timerOn')
 page.clock.fast_forward(100000);assert page.locator('#danceDialog').is_hidden()
 assert page.locator('#missionNext').is_enabled()
 page.locator('#missionNext').click();assert page.evaluate('mission')==1
 assert page.locator('#missionStart').is_visible();assert page.locator('#missionClock').inner_text()=='01:30'
 assert page.evaluate('state.components.length')==0
 # Pausing preserves the remaining time; reload preserves an active wall-clock deadline.
 page.locator('#missionStart').click();page.clock.fast_forward(10000)
 page.locator('#pause').click();before_pause=page.evaluate('remaining');page.clock.fast_forward(1000);assert page.evaluate('remaining')<before_pause
 page.locator('#teacher').click();page.locator('#timerPause').click();paused=page.evaluate('remaining')
 page.clock.fast_forward(5000);assert page.evaluate('remaining')==paused
 assert page.locator('#missionStart').inner_text()=='Resume'
 page.locator('#missionStart').click();page.clock.fast_forward(1000)
 page.reload();assert page.evaluate('missionPhase')=='running';assert 77<=page.evaluate('remaining')<=80
 page.clock.fast_forward(81000);assert page.locator('#danceDialog').is_visible()
 assert page.evaluate('danceRequest.purpose')=='retry'
 approve_retry()
 # Answer viewing cannot bypass an expired attempt; it becomes a retry request.
 page.locator('#missionStart').click();page.locator('#showAnswer').click()
 assert page.evaluate('danceRequest.purpose')=='answer'
 page.clock.fast_forward(3100);page.locator('#approvalPin').fill(TEST_PIN);page.locator('#approveDance').click()
 expect(page.locator('#answerDialog')).to_be_visible()
 page.clock.fast_forward(90000)
 assert page.locator('#answerDialog').is_hidden();assert page.locator('#danceDialog').is_visible()
 assert page.evaluate('danceRequest.purpose')=='retry'
 page.locator('#cancelDance').click();page.locator('#showAnswer').click()
 assert page.evaluate('danceRequest.purpose')=='retry'
 page.locator('#cancelDance').click()
 # Back is still unrestricted and gives the previous mission its own new Start.
 page.locator('#missionBack').click();assert page.evaluate('mission')==0
 assert page.locator('#missionStart').inner_text()=='Start';assert page.evaluate('remaining')==90
 # Visiting another task does not bypass the saved teacher-required retry.
 page.evaluate('state=solutionCircuit(mission);changed()');page.locator('#missionStart').click()
 page.locator('#missionNext').click();assert page.evaluate('mission')==1
 assert page.evaluate('missionPhase')=='expired'
 page.locator('#showAnswer').click();assert page.evaluate('danceRequest.purpose')=='retry'
 approve_retry()
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  assert page.locator('#missionStart').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: fixed 90s clock, explicit Start, expiry at deadline, saved dance, teacher-approved retries, correct answers stop time, pause/resume, reload, no answer bypass, Back and 3 layouts.')
