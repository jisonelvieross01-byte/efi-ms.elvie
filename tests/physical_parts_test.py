"""Physical SVG appearance must preserve circuit topology, touch behavior and offline use."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('#missionStart').click()
 # Palette stays IEC; placed parts are physical by default.
 assert page.locator('#parts button').count()==17
 assert page.locator('#parts [data-renderer]').count()==0
 page.evaluate("state={components:Object.keys(PARTS).map((t,i)=>part(t,150+(i%5)*220,100+Math.floor(i/5)*180)),wires:[]};changed()")
 assert page.locator('#board [data-renderer="physical"]').count()==17
 assert len(set(page.locator('.physical-part').evaluate_all('(es)=>es.map(e=>e.innerHTML)')))==17
 page.screenshot(path='/tmp/circuitlab-3d-gallery.png',full_page=True)
 page.select_option('#examples','meters')
 before=page.evaluate('JSON.stringify(state)');readings=page.evaluate('JSON.stringify(result.readings)')
 assert page.locator('.part-glow').count()==1
 assert page.locator('.physical-part[data-type="ammeter"]').text_content().startswith('0.3')
 assert page.locator('.physical-part[data-type="voltmeter"]').text_content().startswith('6')
 page.locator('#symbolView').tap();assert page.locator('.physical-part').count()==0
 assert page.evaluate('JSON.stringify(state)')==before
 assert page.evaluate('JSON.stringify(result.readings)')==readings
 page.reload();assert page.locator('#symbolView').get_attribute('aria-pressed')=='true'
 page.locator('#physicalView').tap();page.locator('#run').tap()
 assert page.locator('.physical-part').count()==4
 assert page.locator('.part-glow').count()==1
 page.locator('#pause').tap();assert page.locator('.part-glow').count()==0
 page.locator('#run').tap();page.screenshot(path='/tmp/circuitlab-3d-meters.png',full_page=True)
 # Switch body follows real circuit state; LED glow follows solver, never placement.
 page.select_option('#examples','led');assert page.locator('[data-type="led"] .part-glow').count()==1
 page.evaluate("load('reverse-led')");assert page.locator('.part-glow').count()==0
 page.evaluate("load('single');const s=part('switch',450,600);state.components.push(s);selected=s.id;changed()")
 old=page.locator('.physical-part[data-type="switch"]').inner_html();page.locator('#inspector button').tap()
 assert page.locator('.physical-part[data-type="switch"]').inner_html()!=old
 # View controls preserve selection, wires and history.
 page.locator('#symbolView').tap();page.locator('#physicalView').tap()
 page.locator('#rotate').tap();assert page.evaluate('state.components.find(c=>c.type==="switch").rotation')==90
 page.locator('#undo').tap();assert page.evaluate('state.components.find(c=>c.type==="switch").rotation')==0
 # Existing drop path creates physical geometry from a 2D palette symbol.
 page.evaluate("state={components:[],wires:[]};changed()")
 page.locator('#parts [data-type="resistor"]').drag_to(page.locator('#board'),target_position={'x':200,'y':200})
 expect(page.locator('[data-type="resistor"][data-renderer="physical"]')).to_have_count(1)
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':1080 if width==1920 else 800})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert page.locator('#physicalView').bounding_box()['height']>=40
 # Standalone download includes definitions, render code and no sidecar assets.
 page.goto(f'http://127.0.0.1:{server.server_port}/downloads/circuitlab.html')
 if page.locator('#missionStartOverlay').is_visible():page.locator('#missionStart').click()
 page.select_option('#examples','single');assert page.locator('.physical-part').count()==2
 assert page.locator('.part-glow').count()==1
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: all 17 physical parts, IEC palette, view persistence, identical topology/readings, live meters/glows, switch, rotation/history, drag/drop, 375/960/1920 layouts and offline standalone.')
