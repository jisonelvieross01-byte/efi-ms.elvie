"""Real 3-second delay, manual teacher PIN approval, all seven moves, and no answer leaks."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from answer_gate_helpers import setup_teacher_pin,TEST_PIN
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 # No configured PIN: no answer or approval, even after the real timer expires.
 page.locator('#showAnswer').tap();assert page.locator('#danceDialog').is_visible()
 assert page.locator('#approveDance').is_disabled();assert page.locator('#answerDialog').is_hidden()
 assert page.locator('#answerDrawing').locator('*').count()==0
 expect(page.locator('#danceCountdown')).to_have_text('Ready',timeout=6000)
 assert page.locator('#approveDance').is_disabled()
 page.locator('#cancelDance').click();setup_teacher_pin(page)
 # Saved data contains a salted hash, never the test PIN itself.
 record=page.evaluate('JSON.parse(localStorage.getItem(DANCE_PIN_KEY))')
 assert len(record['salt'])==32 and len(record['hash'])==64
 assert TEST_PIN not in str(record)
 # Clock controls accelerate repeated cases; the real countdown was tested above.
 page.clock.install()
 before=page.evaluate('JSON.stringify({state,history,future,classroom})')
 page.locator('#showAnswer').click();move=page.locator('#danceFigure').get_attribute('data-move')
 page.clock.fast_forward(2900);assert page.locator('#approveDance').is_disabled()
 page.evaluate("document.querySelector('#approvalPin').value='246810';document.querySelector('#danceApproval').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))")
 assert page.locator('#answerDialog').is_hidden()
 page.clock.fast_forward(200);assert page.locator('#approveDance').is_enabled()
 # Wrong PIN does not reveal the picture or the explanation.
 page.locator('#approvalPin').fill('000000');page.locator('#approveDance').click()
 expect(page.locator('#danceError')).to_contain_text('Incorrect PIN')
 assert page.locator('#answerDialog').is_hidden();assert page.locator('#explanation').is_hidden()
 page.locator('#adaptedMove').tap();assert page.locator('#danceAlternative').is_visible()
 assert page.locator('#answerDialog').is_hidden()
 page.locator('#approvalPin').fill(TEST_PIN);page.locator('#approveDance').click()
 expect(page.locator('#answerDialog')).to_be_visible();assert page.locator('#danceDialog').is_hidden()
 assert page.evaluate('JSON.stringify({state,history,future,classroom})')==before
 assert page.locator('#missionNext').is_disabled()
 page.locator('#closeAnswer').click()
 # Reopening has the same move, fresh countdown and empty PIN; cancellation never reveals.
 page.locator('#showAnswer').click();assert page.locator('#danceFigure').get_attribute('data-move')==move
 assert page.locator('#approvalPin').input_value()=='';assert page.locator('#approveDance').is_disabled()
 page.keyboard.press('Escape');assert page.locator('#danceDialog').is_hidden()
 page.clock.fast_forward(4000);assert page.locator('#answerDialog').is_hidden()
 # Each shuffled seven-task block contains every move and persists on reload.
 assignments=page.evaluate('danceAssignments')
 assert len(assignments)==24
 for start in [0,7,14]:assert len(set(assignments[start:start+7]))==7
 assert all(a!=b for a,b in zip(assignments,assignments[1:]))
 page.reload();assert page.evaluate('danceAssignments')==assignments
 assert page.evaluate('!!teacherPin()')
 # Exercise every generated SVG animation and verify it stops at 3 seconds.
 seen=set()
 for i in range(7):
  page.evaluate('(i)=>{mission=i;activity()}',i);page.locator('#showAnswer').click()
  seen.add(page.locator('#danceFigure').get_attribute('data-move'))
  active=page.locator('#danceFigure *').evaluate_all('(es)=>es.some(e=>getComputedStyle(e).animationName!=="none")')
  assert active
  page.clock.fast_forward(3100)
  assert 'dance-finished' in page.locator('#danceFigure').get_attribute('class')
  assert page.locator('#answerDialog').is_hidden()
  if i==0:page.screenshot(path='/tmp/circuitlab-dance.png',full_page=True)
  page.locator('#cancelDance').click()
 assert len(seen)==7
 # Programmatic task changes invalidate an open request and clear pending approval.
 page.locator('#showAnswer').click();page.evaluate('mission=9;activity()')
 assert page.locator('#danceDialog').is_hidden();assert page.evaluate('danceRequest===null')
 # Teacher Show answer uses the same gate; PIN changes require the current PIN.
 page.locator('#teacher').click();page.locator('#reveal').click()
 assert page.locator('#danceDialog').is_visible();assert page.locator('#explanation').is_hidden()
 page.locator('#cancelDance').click();page.locator('#teacherPinSetup').click()
 page.locator('#oldTeacherPin').fill('000000');page.locator('#newTeacherPin').fill('135790');page.locator('#confirmTeacherPin').fill('135790');page.locator('#saveTeacherPin').click()
 expect(page.locator('#pinSetupStatus')).to_contain_text('incorrect')
 assert page.locator('#teacherPinDialog').is_visible();page.locator('#closePinSetup').click()
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':800});page.locator('#showAnswer').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#cancelDance').is_visible();page.locator('#cancelDance').click()
 page.emulate_media(reduced_motion='reduce');page.locator('#showAnswer').click()
 assert page.locator('#danceFigure *').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).animationName==="none")')
 assert page.locator('#danceInstruction').inner_text()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: real delay, early/wrong-PIN rejection, teacher approval, 7 random persisted moves, animation stop, seated option, cancellation, task invalidation, protected PIN changes, reduced motion and 3 layouts; no circuit/progress changes.')
