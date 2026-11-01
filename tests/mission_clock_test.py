"""Help unlocks after 80/90 active seconds; expiry has no punishment."""
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
 page=browser.new_page(viewport={'width':1920,'height':1080});page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 auto_dismiss_completion(page)
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.locator('#missionClock').inner_text()=='02:00'
 def locked(hint,answer):
  assert page.locator('#hint').is_disabled()==hint
  assert page.locator('#showAnswer').is_disabled()==answer
  assert page.locator('#reveal').is_disabled()==answer
 locked(True,True)
 assert '90s' in page.locator('#hint').inner_text()
 assert '80s' in page.locator('#showAnswer').inner_text()
 page.clock.fast_forward(180000);assert page.evaluate('remaining')==120
 # Function calls and teacher Reveal obey the same lock as the board button.
 page.evaluate('showAnswer()');assert page.locator('#answerDialog').is_hidden()
 page.locator('#missionStart').click();page.clock.fast_forward(79000)
 assert page.evaluate('remaining')==41;locked(True,True)
 page.locator('#teacher').click();page.locator('#timerPause').click();page.clock.fast_forward(30000)
 assert page.evaluate('remaining')==41;locked(True,True)
 page.locator('#missionStart').click();page.clock.fast_forward(1000)
 assert page.evaluate('remaining')==40;locked(True,False)
 page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
 page.locator('#closeAnswer').click()
 page.clock.fast_forward(9000);assert page.evaluate('remaining')==31;locked(True,False)
 page.reload();locked(True,False)
 page.clock.fast_forward(1000);assert page.evaluate('remaining')==30;locked(False,False)
 page.locator('#hint').click();assert page.locator('#hintLayer [data-guide-part]').count()==2
 page.locator('#teacher').click();page.locator('#reveal').click()
 assert page.locator('#answerDialog').is_visible()
 page.clock.fast_forward(30000);assert page.evaluate('missionPhase')=='expired'
 assert page.locator('#answerDialog').is_visible();locked(False,False)
 page.locator('#closeAnswer').click()
 assert page.locator('#missionNext').is_disabled()
 assert page.locator('#danceDialog').count()==0
 # Retry and navigation relock both buttons and remove the old hint.
 page.locator('#missionStart').click();locked(True,True)
 assert page.locator('#hintLayer [data-guide-part]').count()==0
 assert page.evaluate('remaining')==120
 page.clock.fast_forward(10000);page.reload()
 assert 108<=page.evaluate('remaining')<=110;locked(True,True)
 page.evaluate('state=solutionCircuit(mission);changed()')
 assert page.evaluate('missionPhase')=='complete';locked(False,False)
 page.clock.fast_forward(180000);assert page.evaluate('missionPhase')=='complete'
 page.locator('#missionNext').click();assert page.evaluate('mission')==1
 assert page.locator('#missionClock').inner_text()=='02:00';locked(True,True)
 page.locator('#missionBack').click();assert page.evaluate('mission')==0
 assert page.locator('#missionClock').inner_text()=='02:00';locked(True,True)
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: exact 80/90-second help unlocks, pause/resume, reload, teacher Reveal lock, expiry, review, reset and navigation; two-minute attempts and no penalties.')
