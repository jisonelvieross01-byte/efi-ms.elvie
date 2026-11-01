"""A previous cached, unversioned stylesheet must not break the newly deployed UI."""
from pathlib import Path
from urllib.parse import urlsplit
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1920,'height':1080});assets=[]
 def intercept(route):
  u=urlsplit(route.request.url)
  if u.hostname!='127.0.0.1':route.abort();return
  if u.path.endswith(('.css','.js')):
   assets.append(route.request.url)
   if not u.query:route.fulfill(status=200,content_type='text/css' if u.path.endswith('.css') else 'application/javascript',body='/* stale previous release */');return
  route.continue_()
 page.route('**/*',intercept)
 page.goto(f'http://127.0.0.1:{server.server_port}/tools/circuitlab/index.html')
 assert page.locator('#parts button').count()==17
 assert assets and all('?v=' in url for url in assets)
 assert page.locator('#missionStartOverlay').evaluate('e=>getComputedStyle(e).position')=='absolute'
 assert page.locator('#timerStart').count()==0
 assert page.locator('#missionClockCard').evaluate('e=>getComputedStyle(e).backgroundColor')!='rgba(0, 0, 0, 0)'
 page.locator('#missionStart').click();assert page.evaluate('timerOn')
 # A plain-file bundle still contains its 3D renderer and needs no sidecar assets.
 page.goto(f'http://127.0.0.1:{server.server_port}/downloads/circuitlab.html')
 assert page.evaluate('typeof CircuitDance.play')=='function'
 page.locator('#showAnswer').click();page.wait_for_function('danceRequest && danceRequest.started!==null')
 assert page.locator('#danceFigure').get_attribute('data-renderer')=='webgl'
 browser.close()
server.shutdown()
print('PASS: stale unversioned CSS/JS cannot affect the release; centered Start, highlighted clock and offline standalone 3D dance load correctly.')
