from answer_gate_helpers import unlock_help
"""Hints and immediate answers never change the student's circuit or progress."""
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
 for i in range(25):
  page.evaluate('(i)=>{mission=i;activity()}',i)
  unlock_help(page)
  before=page.evaluate('JSON.stringify({state,serial,history,future,classroom,saved:localStorage.getItem("circuitlab-v1")})')
  unlock_help(page)
  page.locator('#hint').click();assert page.locator('#hintLayer [data-guide-part]').count()>=2
  assert page.locator('#hintLayer .guide-wire').count()==1
  unlock_help(page)
  page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible()
  assert page.locator('#answerConnections li').count()==page.evaluate('solutionCircuit(mission).wires.length')
  assert page.locator('#answerDrawing .guide-terminal-label').count()==page.evaluate('solutionCircuit(mission).components.length*2')
  page.locator('#closeAnswer').click()
  assert page.evaluate('JSON.stringify({state,serial,history,future,classroom,saved:localStorage.getItem("circuitlab-v1")})')==before
  assert page.locator('#missionNext').is_disabled()
  page.evaluate('state=solutionCircuit(mission);beginMission();running=true;changed()')
  assert page.locator('#missionNext').is_enabled();page.locator('#missionNext').click()
  assert page.locator('#hintLayer [data-guide-part]').count()==0
  assert page.evaluate('state.wires.length')==(1 if i==24 else 0)
 unlock_help(page)
 page.locator('#teacher').click();page.locator('#reveal').click()
 assert page.locator('#answerDialog').is_visible();page.locator('#closeAnswer').click()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: instant answer pictures and connection lists for all 25 questions; hints/answers preserve circuits, scores and history; no extra waiting or permission gate once unlocked.')
