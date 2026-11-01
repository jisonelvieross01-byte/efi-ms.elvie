from answer_gate_helpers import unlock_help
"""Offline mouse/touch circuit controls remain usable in the simplified course."""
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
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 auto_dismiss_completion(page)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('#missionStart').click();page.locator('#clear').click()
 def xy(x,y):return page.evaluate('([x,y])=>{const b=document.querySelector("#board"),p=b.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(b.getScreenCTM());return [q.x,q.y]}',[x,y])
 for type,x,y in [('battery',220,200),('lamp',660,440)]:
  page.locator(f'#parts [data-type="{type}"]').click();page.mouse.click(*xy(x,y))
 a,b=page.evaluate('state.components.map(c=>c.id)')
 def terminal(id,t):return page.locator(f'circle.terminal[data-terminal="{id}:{t}"]')
 terminal(a,0).tap();terminal(b,0).tap();terminal(b,1).tap();terminal(a,1).tap()
 page.locator('#run').click();assert page.evaluate('result.active')
 assert abs(page.evaluate(f'result.readings["{b}"].current')-.3)<1e-8
 page.mouse.move(*xy(660,440));page.mouse.down();page.mouse.move(*xy(760,540),steps=8);page.mouse.up()
 assert page.evaluate(f'state.components.find(c=>c.id==="{b}").x')==760
 page.locator('#undo').click();assert page.evaluate(f'state.components.find(c=>c.id==="{b}").x')==660
 page.locator('#redo').click();assert page.evaluate(f'state.components.find(c=>c.id==="{b}").x')==760
 page.mouse.click(*xy(760,540));page.locator('#rotate').click();assert page.evaluate(f'state.components.find(c=>c.id==="{b}").rotation')==90
 page.locator('#delete').click();assert page.evaluate('state.components.length')==1
 page.locator('#undo').click();assert page.evaluate('state.components.length')==2
 for name in ['single','series','parallel','meters','led']:
  page.select_option('#examples',name);assert page.evaluate('result.ok && result.active'),name
 page.evaluate("selected=state.components.find(c=>c.type==='resistor').id;renderInspector()")
 assert page.locator('#inspector input').count()==0
 unlock_help(page)
 page.locator('#showAnswer').click();assert page.locator('#answerDialog').is_visible();page.locator('#closeAnswer').click()
 before=page.evaluate('JSON.stringify(state)');page.reload();assert page.evaluate('JSON.stringify(state)')==before
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/circuitlab-simple-course.png',full_page=True)
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: offline touch wiring, mouse drag, rotate, delete, undo/redo, five examples, no settings sliders, direct answers, persistence and 3 layouts.')
