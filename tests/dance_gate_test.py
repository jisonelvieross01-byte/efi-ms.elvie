"""Downloaded full-body 3D dance: real motion, five seconds, no PIN, local/offline assets."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 requests=[]
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.locator('#teacherPinSetup,#teacherPinDialog,#approvalPin,#approveDance').count()==0
 assert page.locator('#timerStart').count()==0
 assert page.locator('#missionStart').is_visible()
 board=page.locator('#board').bounding_box();start=page.locator('#missionStart').bounding_box()
 assert board['x']<=start['x'] and start['x']+start['width']<=board['x']+board['width']
 assert board['y']<=start['y'] and start['y']+start['height']<=board['y']+board['height']
 # A normal Run click now starts the actual visible clock too.
 page.locator('#run').click();assert page.evaluate('timerOn')
 expect(page.locator('#missionClock')).not_to_have_text('01:30',timeout=3000)
 assert int(page.locator('#missionClock').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))>=34
 # The real downloaded model must load in WebGL, not silently pass through the fallback.
 before=page.evaluate('JSON.stringify({state,history,future,classroom})')
 page.locator('#showAnswer').tap();page.wait_for_function('danceRequest && danceRequest.started!==null')
 assert page.locator('#danceFigure').get_attribute('data-renderer')=='webgl'
 canvas=page.locator('#danceFigure canvas');assert canvas.is_visible()
 assert page.locator('#continueDance').is_disabled();assert page.locator('#answerDialog').is_hidden()
 first=canvas.screenshot();page.wait_for_timeout(300);second=canvas.screenshot();assert first!=second,'3D character did not visibly move'
 expect(page.locator('#continueDance')).to_be_enabled(timeout=7000)
 # Movement continues after the viewing gate, so late viewers still see the dance.
 third=canvas.screenshot();page.wait_for_timeout(300);fourth=canvas.screenshot();assert third!=fourth,'Dance froze after the gate'
 page.screenshot(path='/tmp/circuitlab-3d-dance.png',full_page=True)
 page.locator('#continueDance').click();expect(page.locator('#answerDialog')).to_be_visible()
 assert page.evaluate('JSON.stringify({state,history,future,classroom})')==before
 assert page.locator('#missionNext').is_disabled();page.locator('#closeAnswer').click()
 # Repeatable virtual-time checks cover all seven saved variants and the full five seconds.
 page.clock.install();assignments=page.evaluate('danceAssignments');seen=set()
 for i in range(7):
  page.evaluate('(i)=>{mission=i;activity()}',i);page.locator('#showAnswer').click()
  page.wait_for_function('danceRequest && danceRequest.started!==null')
  seen.add(page.locator('#danceFigure').get_attribute('data-move'))
  page.clock.fast_forward(4800);assert page.locator('#continueDance').is_disabled()
  page.evaluate('document.querySelector("#continueDance").click()');assert page.locator('#answerDialog').is_hidden()
  page.clock.fast_forward(300);assert page.locator('#continueDance').is_enabled()
  page.locator('#cancelDance').click()
 assert len(seen)==7
 page.reload();assert page.evaluate('danceAssignments')==assignments
 page.locator('#showAnswer').click();page.wait_for_function('danceRequest && danceRequest.started!==null')
 page.locator('#replayDance').click();page.wait_for_function('danceRequest && danceRequest.started!==null')
 assert page.locator('#continueDance').is_disabled()
 page.keyboard.press('Escape');assert page.locator('#danceDialog').is_hidden()
 assert page.locator('#answerDialog').is_hidden()
 # Reduced motion has a still 3D pose; a deliberate Play dance opts into motion.
 page.emulate_media(reduced_motion='reduce');page.locator('#showAnswer').click();page.wait_for_function('danceRequest && danceRequest.started!==null')
 assert page.locator('#danceMotionNote').is_visible();assert page.locator('#danceFigure').get_attribute('data-motion')=='still'
 page.locator('#replayDance').click();page.wait_for_function('danceRequest && danceRequest.started!==null')
 assert page.locator('#danceFigure').get_attribute('data-motion')=='playing'
 page.locator('#adaptedMove').click();assert page.locator('#danceAlternative').is_visible()
 page.locator('#cancelDance').click()
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900});page.locator('#showAnswer').click()
  page.wait_for_function('danceRequest && danceRequest.started!==null')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#cancelDance').is_visible();page.locator('#cancelDance').click()
 assert not any('http' in u and '127.0.0.1' not in u for u in requests),requests
 assert not errors,errors
 # Unsupported WebGL has an honest, shaped toy-robot fallback and the same gate.
 fallback=browser.new_page(viewport={'width':960,'height':900})
 fallback.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).includes('webgl'))return null;return original.call(this,kind,...args)}")
 fallback.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 fallback.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 fallback.clock.install();fallback.locator('#showAnswer').click()
 fallback.wait_for_function('danceRequest && danceRequest.started!==null')
 assert fallback.locator('#danceFigure').get_attribute('data-renderer')=='css'
 assert fallback.locator('#robotFallback').is_visible()
 assert fallback.locator('#continueDance').is_disabled()
 fallback.clock.fast_forward(5100);assert fallback.locator('#continueDance').is_enabled()
 fallback.locator('#continueDance').click();expect(fallback.locator('#answerDialog')).to_be_visible()
 fallback.close()
 browser.close()
server.shutdown()
print('PASS: real full-body WebGL dance visibly moves before/after 5s, all 7 variants, no PIN/duplicate Start, real timer ticks, Replay/Continue, reduced motion opt-in, offline resources and 3 layouts.')
