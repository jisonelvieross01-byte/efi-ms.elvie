"""Original achievement reveal appears only for a verified answer, once per attempt."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.locator('#completionDialog').is_hidden()
 page.locator('#missionStart').tap()
 ids=page.evaluate('state.components.map(c=>c.id)')
 page.locator(f'circle.terminal[data-terminal="{ids[0]}:1"]').tap()
 page.locator(f'circle.terminal[data-terminal="{ids[1]}:1"]').tap()
 expect(page.locator('#completionDialog')).to_be_visible()
 assert page.locator('#completionTitle').inner_text()=='Demo complete!'
 assert 'correct' in page.locator('#completionMessage').inner_text()
 assert 'New badge' in page.locator('#completionBadgeStatus').inner_text()
 assert page.evaluate('classroom.completed.length')==1
 assert page.evaluate('missionPhase')=='complete';assert not page.evaluate('timerOn')
 page.screenshot(path='/tmp/circuitlab-mission-complete.png',full_page=True)
 state=page.evaluate('JSON.stringify(state)');page.locator('#closeCompletion').click()
 assert page.evaluate('JSON.stringify(state)')==state
 page.evaluate('changed()');assert page.locator('#completionDialog').is_hidden()
 page.locator('#missionNext').tap();assert page.evaluate('mission')==1
 assert page.evaluate('state.components.length')==0
 page.locator('#showAnswer').tap();assert page.locator('#answerDialog').is_visible()
 page.locator('#closeAnswer').click();assert page.locator('#completionDialog').is_hidden()
 page.evaluate('state=solutionCircuit(mission);beginMission();changed()')
 expect(page.locator('#completionDialog')).to_be_visible();assert page.locator('#completionTitle').inner_text()=='Mission complete!'
 page.locator('#closeCompletion').click();page.reload()
 assert page.locator('#completionDialog').is_hidden();assert page.locator('#missionNext').is_enabled()
 page.locator('#missionNext').click();page.locator('#missionBack').click()
 page.evaluate('state=solutionCircuit(mission);beginMission();changed()')
 expect(page.locator('#completionDialog')).to_be_visible()
 assert 'already collected' in page.locator('#completionBadgeStatus').inner_text()
 assert page.evaluate('classroom.completed.length')==2
 page.locator('#completionNext').click();assert page.evaluate('mission')==2
 assert page.evaluate('state.components.length')==0
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  page.evaluate('state=solutionCircuit(mission);beginMission();changed()')
  expect(page.locator('#completionDialog')).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#completionNext').click()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: real teacher wire demo triggers success, correct-only popup, no repeated/farmed badges, review/Next choices, no reload popup, preserved circuitry and 3 layouts.')
