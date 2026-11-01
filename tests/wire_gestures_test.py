"""Direct wiring, stretch/reconnect and visible rotation must preserve accurate circuits."""
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
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 page.locator('#missionStart').click()
 def xy(x,y):return page.evaluate('([x,y])=>{const b=document.querySelector("#board"),p=b.createSVGPoint();p.x=x;p.y=y;const r=p.matrixTransform(b.getScreenCTM());return [r.x,r.y]}',[x,y])
 def terminal(key):return page.evaluate('k=>endpoint(k)',key)
 def mouse_drag(a,b):
  page.mouse.move(*xy(a['x'],a['y']));page.mouse.down();page.mouse.move(*xy(b['x'],b['y']),steps=12);page.mouse.up()
 def touch_drag(a,b):
  session=context.new_cdp_session(page);start=xy(a['x'],a['y']);end=xy(b['x'],b['y'])
  session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start[0],'y':start[1]}]})
  for i in range(1,9):session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start[0]+(end[0]-start[0])*i/8,'y':start[1]+(end[1]-start[1])*i/8}]})
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});session.detach()
 page.evaluate("state={components:[part('battery',220,200,6),part('lamp',680,440,20),part('resistor',950,620,100)],wires:[]};changed()")
 source,lamp,resistor=page.evaluate('state.components.map(c=>c.id)')
 page.locator('#parts [data-type="wire"]').click()
 assert page.evaluate('state.components.length')==3
 assert page.evaluate('tool')=='wire'
 # One mouse gesture creates one complete wire; a real touch gesture closes the loop.
 mouse_drag(terminal(source+':0'),terminal(lamp+':0'))
 assert page.evaluate('state.wires.length')==1
 touch_drag(terminal(lamp+':1'),terminal(source+':1'))
 assert page.evaluate('state.wires.length')==2
 page.locator('#run').click();assert page.evaluate('result.ok && result.active')
 assert abs(page.evaluate(f'result.readings["{lamp}"].current')-.3)<1e-8
 # Rotating a connected part retains wire identities and measured current.
 page.mouse.click(*xy(680,440));page.locator('[data-rotate-part]').tap()
 assert page.evaluate(f'state.components.find(c=>c.id==="{lamp}").rotation')==90
 assert abs(page.evaluate(f'result.readings["{lamp}"].current')-.3)<1e-8
 page.locator('#undo').click();assert page.evaluate(f'state.components.find(c=>c.id==="{lamp}").rotation')==0
 # Select wire via its actual on-screen path.
 wire=page.evaluate('state.wires[0].id')
 mid=page.evaluate('wireMidpoint(state.wires[0])');page.mouse.click(*xy(mid['x'],mid['y']))
 assert page.evaluate('selected')==wire
 original=page.evaluate('JSON.stringify(result.readings)')
 handle=page.locator('[data-wire-handle="bend"]');box=handle.bounding_box()
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(*xy(1120,700),steps=10);page.mouse.up()
 assert page.evaluate('state.wires[0].bend')=={'x':1120,'y':700}
 assert page.evaluate('JSON.stringify(result.readings)')==original
 long_length=page.evaluate('(()=>{const p=wirePoints(state.wires[0]);return p.slice(1).reduce((s,b,i)=>s+Math.hypot(b.x-p[i].x,b.y-p[i].y),0)})()')
 # Touch stretch returns it toward a shorter route; no extra wires/components appear.
 page.evaluate('id=>{selected=id;renderBoard();renderInspector()}',wire)
 midpoint=page.evaluate('wireMidpoint(state.wires[0])')
 touch_drag(midpoint,{'x':440,'y':300})
 short_length=page.evaluate('(()=>{const p=wirePoints(state.wires[0]);return p.slice(1).reduce((s,b,i)=>s+Math.hypot(b.x-p[i].x,b.y-p[i].y),0)})()')
 assert short_length<long_length,(short_length,long_length)
 assert page.evaluate('state.wires.length')==2
 assert page.evaluate('state.components.length')==3
 assert page.evaluate('JSON.stringify(result.readings)')==original
 page.reload();page.locator('#run').click();assert page.evaluate('state.wires[0].bend')=={'x':440,'y':300}
 page.screenshot(path='/tmp/circuitlab-wire-controls.png',full_page=True)
 # Reconnect an end to a different component with no extra wire pieces.
 page.evaluate('id=>{selected=id;renderBoard();renderInspector()}',wire)
 old_b=page.evaluate('state.wires[0].b')
 touch_drag(terminal(old_b),terminal(resistor+':0'))
 assert page.evaluate('state.wires[0].b')==resistor+':0'
 assert page.evaluate('state.wires.length')==2
 assert not page.evaluate('result.active')
 page.locator('#undo').click();assert page.evaluate('state.wires[0].b')==old_b
 assert page.evaluate('result.active')
 page.locator('#redo').click();assert page.evaluate('state.wires[0].b')==resistor+':0'
 page.locator('#undo').click()
 # Dropping in empty space preserves both topology and history.
 page.evaluate('id=>{selected=id;renderBoard();renderInspector()}',wire)
 before=page.evaluate('JSON.stringify({state,history})')
 mouse_drag(terminal(old_b),{'x':1100,'y':100})
 assert page.evaluate('JSON.stringify({state,history})')==before
 # Escape and pointercancel discard previews, never create phantom wires.
 page.evaluate("selected=null;armed=null;renderBoard()")
 start=terminal(resistor+':1');page.mouse.move(*xy(start['x'],start['y']));page.mouse.down();page.mouse.move(*xy(1100,100),steps=5);page.keyboard.press('Escape');page.mouse.up()
 assert page.evaluate('state.wires.length')==2
 # A real cancelled touch gesture discards the preview and leaves history intact.
 page.evaluate("selected=null;armed=null;renderBoard()")
 before=page.evaluate('JSON.stringify({state,history})')
 session=context.new_cdp_session(page);a=terminal(resistor+':1');start=xy(a['x'],a['y']);end=xy(1100,100)
 session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start[0],'y':start[1]}]})
 session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':end[0],'y':end[1]}]})
 session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});session.detach()
 assert page.evaluate('JSON.stringify({state,history})')==before
 assert page.locator('#wirePreview path').count()==0
 # Duplicate gestures do not add duplicate connections or undo entries.
 mouse_drag(terminal(source+':0'),terminal(lamp+':0'))
 assert page.evaluate('JSON.stringify({state,history})')==before
 assert not errors,errors
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 browser.close()
server.shutdown()
print('PASS: mouse/touch wire drawing, rotation of connected parts, stretch/shorten with unchanged readings, persistence, reconnect, undo/redo, invalid drop, Escape and three layouts.')
