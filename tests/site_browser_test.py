"""Website integration checks using Chromium, with non-local network blocked."""
from pathlib import Path
from completion_helpers import auto_dismiss_completion
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True,accept_downloads=True)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 auto_dismiss_completion(page)
 page.goto(URL);assert page.locator('.tool-card').count()==1
 assert page.locator('#toolCount').inner_text()=='1 classroom tool'
 page.locator('#search').fill('circuit');assert page.locator('.tool-card').count()==1
 page.locator('#search').fill('no such tool');assert page.locator('#noResults').is_visible()
 page.locator('#search').fill('');page.locator('[data-category="Physics"]').tap();assert page.locator('.tool-card').count()==1
 page.locator('[data-category="All"]').tap()
 # A real standalone HTML download works, without any JS/CSS sidecar requests.
 with page.expect_download() as download:page.locator('.download').click()
 downloaded=Path('/tmp/circuitlab-standalone-test.html');download.value.save_as(downloaded)
 assert 'CircuitSolver' in downloaded.read_text()
 page.goto(URL+'/downloads/circuitlab.html');page.locator('#missionStart').click();page.select_option('#examples','parallel')
 assert page.evaluate('result.ok && result.active')
 assert page.evaluate('Math.abs(result.readings[state.components.find(c=>c.type==="battery").id].current + .12)<1e-7')
 page.goto(URL)
 # An upload is stored, survives reload and executes in the isolated viewer.
 html=b'''<!doctype html><html><head><title>Local test tool</title></head><body><h1 id="answer">Loading</h1><script>let safe=false;try{parent.localStorage.getItem('circuitlab-v1')}catch(e){safe=true}document.querySelector('#answer').textContent=safe?'Isolated tool running':'Isolation failed';</script></body></html>'''
 page.locator('#upload').set_input_files({'name':'local-test.html','mimeType':'text/html','buffer':html})
 page.wait_for_selector('.personal-card');assert page.locator('.personal-card h3').inner_text()=='Local test tool'
 page.reload();page.wait_for_selector('.personal-card')
 page.locator('.personal-actions button').first.tap()
 assert page.locator('#viewer').is_visible()
 assert page.frame_locator('#toolFrame').locator('#answer').inner_text()=='Isolated tool running'
 assert page.locator('#closeViewer').inner_text()=='← Go back'
 page.locator('#closeViewer').tap();assert not page.locator('#viewer').is_visible()
 assert page.locator('#toolFrame').get_attribute('srcdoc')==''
 page.locator('.personal-actions button').last.click();expect(page.locator('.personal-card')).to_have_count(0)
 page.reload();assert page.locator('.personal-card').count()==0
 # Unsupported files are rejected with useful feedback.
 page.locator('#upload').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'hello'})
 assert 'Choose an .html' in page.locator('#notice').inner_text()
 # Guides and launched app resolve from the built site.
 for route in ['guides/getting-started.html','guides/classroom.html','guides/examples.html','guides/publishing.html']:
  response=page.goto(URL+'/'+route);assert response.ok;assert page.locator('h1').count()==1
 page.goto(URL);page.locator('.tool-card .primary').click();assert page.locator('#board').is_visible()
 # A direct home link works even with no previous history, and keeps saved work.
 for width in [375,960,1920]:
  page.set_viewport_size({'width':width,'height':900})
  back=page.locator('#labHome');assert back.inner_text()=='← Go back'
  box=back.bounding_box();assert box['width']>=40 and box['height']>=40
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 saved=page.evaluate('JSON.stringify({state,classroom,mission})')
 page.locator('#labHome').tap();page.wait_for_url(URL+'/index.html#library')
 assert page.locator('#toolGrid').is_visible()
 page.locator('.tool-card .primary').click()
 page.wait_for_url(URL+'/tools/circuitlab/index.html')
 page.wait_for_function('typeof state!=="undefined"')
 assert page.evaluate('JSON.stringify({state,classroom,mission})')==saved
 # The bundled download uses a different relative path back to the same home.
 page.goto(URL+'/downloads/circuitlab.html');page.locator('#labHome').tap()
 page.wait_for_url(URL+'/index.html#library')
 page.goto(URL);page.screenshot(path='/tmp/learning-lab-desktop.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/learning-lab-mobile.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#search').fill('lamp');assert page.locator('.tool-card').count()==0
 page.locator('#search').fill('physics');assert page.locator('.tool-card').count()==1
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: catalog/search/filter, standalone download & simulation, persistent HTML import, isolated execution, remove, invalid upload, four HTML guides, app launch, desktop/mobile layouts; no JavaScript errors.')
