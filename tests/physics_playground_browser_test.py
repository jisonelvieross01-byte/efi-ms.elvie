from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parents[1])))
Thread(target=server.serve_forever,daemon=True).start()
# Run from the repository with system Chromium; external requests are blocked.
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':900},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/physics-playground/index.html');page.wait_for_timeout(500);page.screenshot(path='/tmp/physics-force.png')
 for w,h in [(1920,1080),(1280,720),(1600,900)]:
  page.set_viewport_size({'width':w,'height':h})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight')
 page.locator('#pause').click();page.wait_for_timeout(1200);assert page.locator('#clock').inner_text()=='54:59';page.locator('#pause').click()
 # Actual pointer drag, then keyboard-accessible slider alternative.
 handle=page.locator('circle[role=slider]').first.bounding_box()
 page.mouse.move(handle['x']+handle['width']/2,handle['y']+handle['height']/2);page.mouse.down();page.mouse.move(handle['x']-30,handle['y']+25);page.mouse.up()
 assert page.evaluate('values[0] != 100')
 page.locator('#reset').click()
 # Large touch adjustment panel and direct experiment navigation.
 page.locator('[data-edit="0"]').click()
 assert page.locator('#valueEditor').is_visible()
 page.locator('#moreValue').click();page.locator('#moreValue').click();page.locator('#applyValue').click()
 assert page.evaluate('values[0]===120')
 assert page.locator('#out0').inner_text()=='120 N'
 page.locator('[data-challenge="3"]').click()
 assert page.locator('#title').inner_text()=='Moving, yet balanced'
 page.locator('[data-challenge="0"]').click()
 assert page.locator('#title').inner_text()=='A fair tug'
 for st in range(3):
  page.locator(f'nav button[data-station="{st}"]').click()
  for i in range(5):
   assert page.locator('#test').is_disabled()
   if st==2 and i==4:
    assert page.locator('[data-i="0"]').is_disabled()
    assert page.locator('[data-edit="0"]').is_disabled()
    page.locator('[data-i="3"]').focus();page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight')
    assert page.evaluate('values[3]===1.5')
   page.locator('#predict').click();page.locator('#commit').click();assert page.locator('#test').is_enabled()
   page.locator('#test').click()
   # Accelerate only the animation clock; retain the real equations and DOM interactions.
   page.evaluate('start -= 25000')
   page.wait_for_function('!running')
   page.locator('#explain').click();assert len(page.locator('#explainText').inner_text())>50
   if st==2 and i==4:assert '1.5 m' in page.locator('#explainText').inner_text()
   page.locator('#closeExplain').click()
   # Side controls and roles must stay above the action bar, even for long prompts/results.
   assert page.locator('.roles').bounding_box()['y']+page.locator('.roles').bounding_box()['height'] <= page.locator('footer').bounding_box()['y']
   assert page.locator('#controls').bounding_box()['y']+page.locator('#controls').bounding_box()['height'] <= page.locator('#feedback').bounding_box()['y']
   if i==0:
    page.wait_for_timeout(500)
    page.screenshot(path=f'/tmp/physics-station-{st}.png')
   if i<4:page.locator('#next').click()
 assert page.locator('#count').inner_text()=='15 / 15 tested'
 assert 'Balanced!' in page.locator('#feedback').inner_text()
 page.locator('#next').click();assert 'complete' in page.locator('#explainTitle').inner_text()
 assert not errors,errors
 b.close()
print('PASS: offline file, 15 challenges, prediction gating, real arrow drag, large touch value editor, experiment navigation, no panel overlap, final 1.5 m balance, timer, progress, explanations, no scroll at 3 TV sizes, no JS errors')
