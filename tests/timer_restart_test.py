"""Restart grants two fresh minutes while preserving classroom and circuit work."""
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
 page=browser.new_page(viewport={'width':1920,'height':1080},has_touch=True)
 page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('#timerRestart').tap()
 assert page.evaluate('missionPhase')=='running'
 assert page.locator('#missionClock').inner_text()=='02:00'
 # Make a real undoable edit, then leave a visible hint before restarting.
 page.locator('#components > g').last.tap();page.locator('#rotate').tap()
 page.clock.fast_forward(30000);page.locator('#hint').tap()
 assert page.locator('#hintLayer [data-guide-part]').count()==2
 snapshot=page.evaluate('JSON.stringify({state,history,future,classroom,mission})')
 page.locator('#timerRestart').tap()
 assert page.evaluate('JSON.stringify({state,history,future,classroom,mission})')==snapshot
 assert page.evaluate('remaining')==120
 assert page.evaluate('timerOn && running && missionPhase==="running"')
 assert page.locator('#missionStartOverlay').is_hidden()
 assert page.locator('#hint').is_disabled() and page.locator('#showAnswer').is_disabled()
 assert page.locator('#hintLayer [data-guide-part]').count()==0
 saved_work=page.evaluate('JSON.stringify({state,classroom,mission})')
 page.clock.fast_forward(10000);page.reload()
 assert 109<=page.evaluate('remaining')<=110
 assert page.evaluate('JSON.stringify({state,classroom,mission})')==saved_work
 page.locator('#teacher').click();page.locator('#timerPause').click()
 assert page.evaluate('missionPhase')=='paused'
 page.locator('#timerRestart').tap()
 assert page.evaluate('missionPhase')=='running' and page.evaluate('remaining')==120
 page.clock.fast_forward(120000);assert page.evaluate('missionPhase')=='expired'
 page.locator('#timerRestart').tap()
 assert page.evaluate('missionPhase')=='running' and page.evaluate('remaining')==120
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  page.locator('#timerRestart').tap()
  assert page.evaluate('remaining')==120
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  box=page.locator('#timerRestart').bounding_box();clock=page.locator('#missionClock').bounding_box()
  assert box['width']>=40 and box['height']>=40
  assert box['x']>=clock['x']+clock['width']
 page.evaluate('state=solutionCircuit(mission);changed()')
 assert page.evaluate('missionPhase')=='complete'
 page.locator('#closeCompletion').click()
 assert page.locator('#timerRestart').is_disabled()
 assert page.locator('#missionNext').is_enabled()
 before=page.evaluate('JSON.stringify({state,classroom,mission,remaining,missionPhase})')
 page.evaluate('restartMissionTimer()')
 assert page.evaluate('JSON.stringify({state,classroom,mission,remaining,missionPhase})')==before
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: touch Restart beside timer, running/paused/expired attempts, preserved circuit/history/progress, fresh help countdowns, deadline reload, verified-state protection and three layouts.')
