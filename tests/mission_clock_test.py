"""Two-minute attempts; no punishments or answer gates after an incorrect/expired attempt."""
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
 page.clock.fast_forward(180000);assert page.evaluate('remaining')==120
 page.locator('#missionStart').click();page.clock.fast_forward(119000)
 assert page.evaluate('remaining')==1
 page.clock.fast_forward(1100);assert page.evaluate('missionPhase')=='expired'
 assert page.locator('#answerDialog').is_hidden()
 assert page.locator('#missionNext').is_disabled()
 assert page.locator('#danceDialog').count()==0
 page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
 page.locator('#closeAnswer').click();page.locator('#missionStart').click()
 assert page.evaluate('missionPhase')=='running';assert 119<=page.evaluate('remaining')<=120
 page.clock.fast_forward(10000);page.reload()
 assert 108<=page.evaluate('remaining')<=110
 assert page.evaluate('missionPhase')=='running'
 page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
 page.clock.fast_forward(120000);assert page.evaluate('missionPhase')=='expired'
 assert page.locator('#answerDialog').is_visible();page.locator('#closeAnswer').click()
 # Going back or resetting is unrestricted; there are no dance/permission locks.
 page.locator('#run').click();assert page.evaluate('remaining')==120
 page.evaluate('state=solutionCircuit(mission);changed()');assert page.evaluate('missionPhase')=='complete'
 page.clock.fast_forward(180000);assert page.evaluate('missionPhase')=='complete'
 page.locator('#missionNext').click();assert page.evaluate('mission')==1
 assert page.locator('#missionClock').inner_text()=='02:00'
 page.locator('#missionBack').click();assert page.evaluate('mission')==0
 assert page.locator('#missionClock').inner_text()=='02:00'
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: two-minute clock, explicit Start, exact expiry, instant answers after timeout, immediate retry, deadline reload, success stops time, Back and no penalties.')
