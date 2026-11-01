"""Offline Chromium integration checks; uses system Chromium and Python Playwright."""
from pathlib import Path
from answer_gate_helpers import approve_answer
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 page=context.new_page(); errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 context.route('**/*',lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('#missionStart').click()
 assert page.locator('#parts button').count()==17
 # Actual mouse dragging, terminal connection and undo/redo.
 page.locator('#parts [data-type="battery"]').click()
 board=page.locator('#board');box=board.bounding_box()
 def xy(x,y):return page.evaluate('([x,y])=>{const p=document.querySelector("#board").createSVGPoint();p.x=x;p.y=y;const r=p.matrixTransform(document.querySelector("#board").getScreenCTM());return [r.x,r.y]}',[x,y])
 page.mouse.click(*xy(220,200));page.locator('#parts [data-type="lamp"]').click();page.mouse.click(*xy(660,440))
 ids=page.evaluate('state.components.map(c=>c.id)');s,l=ids
 def term(id,t):return page.locator(f'circle.terminal[data-terminal="{id}:{t}"]')
 term(s,0).tap();term(l,0).tap();term(l,1).tap();term(s,1).tap()
 page.locator('#run').click();assert page.evaluate('result.active')
 assert abs(page.evaluate(f'result.readings["{l}"].current')-.3)<1e-8
 page.mouse.move(*xy(660,440));page.mouse.down();page.mouse.move(*xy(760,540),steps=8);page.mouse.up()
 assert page.evaluate(f'state.components.find(c=>c.id==="{l}").x')==760
 page.locator('#undo').click();assert page.evaluate(f'state.components.find(c=>c.id==="{l}").x')==660
 page.locator('#redo').click();assert page.evaluate(f'state.components.find(c=>c.id==="{l}").x')==760
 page.locator('#rotate').click();assert page.evaluate(f'state.components.find(c=>c.id==="{l}").rotation')==0 # undo clears selection
 page.mouse.click(*xy(760,540));page.locator('#rotate').click();assert page.evaluate(f'state.components.find(c=>c.id==="{l}").rotation')==90
 page.locator('#delete').click();assert page.evaluate('state.components.length')==1
 page.locator('#undo').click();assert page.evaluate('state.components.length')==2
 # Every example solves and produces the expected behavior.
 for name in ['single','series','parallel','meters','led']:
  page.select_option('#examples',name);assert page.evaluate('result.ok && result.active'),name
  if name=='series':assert page.evaluate('state.components.filter(c=>c.type==="resistor").every(c=>Math.abs(Math.abs(result.readings[c.id].current)-.03)<1e-7)')
  if name=='parallel':assert page.evaluate('state.components.filter(c=>c.type==="resistor").every(c=>Math.abs(Math.abs(result.readings[c.id].current)-.06)<1e-7)')
  if name=='meters':assert page.evaluate('Math.abs(result.readings[state.components.find(c=>c.type==="voltmeter").id].voltage-6)<1e-7')
 # Mission validation must require the correct circuit.
 page.locator('[data-mode="missions"]').click();page.select_option('#examples','single');assert 'verified' in page.locator('#missionStatus').inner_text()
 page.locator('#missionNext').click();assert 'verified' not in page.locator('#missionStatus').inner_text()
 page.evaluate("load('series');mission=4;beginMission();activity()");assert 'verified' in page.locator('#missionStatus').inner_text()
 page.evaluate("load('parallel');mission=5;activity()");assert 'verified' in page.locator('#missionStatus').inner_text()
 page.evaluate("load('meters');mission=2;activity()");assert 'verified' in page.locator('#missionStatus').inner_text()
 page.evaluate("mission=3;activity()");assert 'verified' in page.locator('#missionStatus').inner_text()
 # Remaining mission validators: modify real templates, not their measured results.
 page.evaluate("load('led');mission=7;activity()")
 assert 'verified' in page.locator('#missionStatus').inner_text()
 for kind,idx,value in [('variable',6,200),('ldr',8,100),('thermistor',8,100),('switch',1,None),('switch',9,None)]:
  page.evaluate("""([kind,idx,value])=>{load(idx===9?'meters':'single');const c=part(kind,450,600,value);c.closed=true;const s=state.components.find(c=>c.type==='battery');const wire=state.wires.find(w=>w.a===s.id+':0');const target=wire.b;wire.b=c.id+':0';state.components.push(c);state.wires.push({id:'w'+(++serial),a:c.id+':1',b:target});mission=idx;changed();activity();}""",[kind,idx,value])
  assert 'verified' in page.locator('#missionStatus').inner_text(),(kind,idx)
 page.evaluate("load('meters')")
 # Slider changes real solver values.
 page.evaluate("selected=state.components.find(c=>c.type==='battery').id;renderInspector()")
 slider=page.locator('#inspector input');slider.fill('12');slider.dispatch_event('input');slider.dispatch_event('change')
 assert abs(page.evaluate('Math.abs(result.readings[state.components.find(c=>c.type==="ammeter").id].current)')-.6)<1e-8
 # Switch pause and resume; timer controls and explanation.
 page.evaluate("checkpoint();const s=part('switch',450,600);state.components.push(s);selected=s.id;changed()")
 page.locator('#inspector button').click();assert page.evaluate("state.components.find(c=>c.type==='switch').closed")
 page.locator('#teacher').click();page.locator('#run').click();assert page.evaluate('timerOn && running')
 page.locator('#timerPause').click();assert page.evaluate('!timerOn && !running')
 approve_answer(page,'#reveal');assert page.locator('#explanation').is_visible()
 page.locator('#closeAnswer').click()
 # Mission-only navigation and local board/progress persistence.
 assert page.locator('#modes button').count()==1
 assert page.locator('#modes button').inner_text()=='Mission'
 before=page.evaluate('JSON.stringify(state)');page.reload()
 assert page.evaluate('JSON.stringify(state)')==before
 assert page.evaluate('mode')=='missions'
 # Offline mode: no requests needed after opening a local file.
 page.reload();assert page.locator('#parts button').count()==17
 page.select_option('#examples','meters')
 page.screenshot(path='/tmp/circuitlab-desktop.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 page.set_viewport_size({'width':960,'height':600});page.screenshot(path='/tmp/circuitlab-small.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert not errors,errors
 browser.close()
 print('PASS: offline load, touch wiring, drag, rotate, delete, undo/redo, 5 examples, missions, sliders, switches, teacher timer, mission-only navigation, persistence, 2 layouts; no JavaScript errors.')
