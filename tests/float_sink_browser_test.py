"""Exercise the Grade 8 offline laboratory with Chromium and real pointer controls."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT/'dist')))
Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1600,'height':900}, has_touch=True, accept_downloads=True)
    context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith('file:') else r.abort())
    page = context.new_page()
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL+'/tools/float-sink/index.html')
    page.locator('#begin').tap()
    def fit():
        assert page.evaluate('''() => [...document.querySelectorAll('#workspace>.panel')].every(e=>e.scrollHeight<=e.clientHeight+1)''')
        assert page.evaluate('document.documentElement.scrollHeight===innerHeight')
    def lab(n):
        page.evaluate(f'openLab({n},false)')
        fit()
    page.fill('#rho', '.25')
    page.locator('[data-value="sink"]').tap()
    page.click('#release')
    assert not page.evaluate('complete[0]')
    page.locator('[data-value="float"]').tap()
    page.click('#release')
    assert page.evaluate('complete[0]')
    for i, density in [(1,.6),(2,1.2),(3,2.7)]:
        page.click(f'[data-object="{i}"]')
        page.fill('#rho',str(density))
        page.click('[data-value="'+('float' if density<1 else 'sink')+'"]')
        page.click('#release')
        assert page.locator('#feedback').get_attribute('class')=='good'
    lab(1)
    source=page.locator('#stone').bounding_box(); target=page.locator('#cylinder').bounding_box()
    page.mouse.move(source['x']+source['width']/2,source['y']+source['height']/2)
    page.mouse.down();page.mouse.move(target['x']+target['width']/2,target['y']+target['height']/2,steps=15);page.mouse.up()
    assert page.evaluate('s.placed')
    page.fill('#finalAnswer',str(page.evaluate('s.initial+s.volume')))
    page.fill('#volumeAnswer',str(page.evaluate('s.volume')))
    page.click('#checkVolume');assert page.evaluate('complete[1]')
    page.click('#lift');assert not page.evaluate('s.placed')
    page.locator('#stone').tap();page.locator('#cylinder').tap();assert page.evaluate('s.placed')
    lab(2)
    for state in ['solid','liquid','gas']:
        page.click(f'[data-phase="{state}"]')
        page.click('[data-value="a"]');page.click('#heatBoth');page.click('#compare')
        assert page.locator('#feedback').get_attribute('class')=='good'
        assert abs(page.evaluate('(s.ta-s.cfg.base)/(s.tb-s.cfg.base)')-2)<.001
        page.click('#coolBoth');assert page.evaluate('s.qa===0 && s.qb===0')
    lab(3)
    for _ in range(3):
        page.fill('#missingEnergy',str(page.evaluate('s.device.thermal')));page.click('#makeChip');fit()
        for key in ['light','sound','thermal']:
            page.locator(f'[data-chip="{key}"]').tap();page.locator(f'[data-output="{key}"]').tap()
        page.click('#runMachine');assert page.evaluate('complete[3]')
        assert page.evaluate('Object.values(s.assign).reduce((a,k)=>a+s.device[k],0)===s.device.input')
        page.click('#newTrial')
    lab(4)
    page.fill('#finalEnergy','680');page.click('#verifyFinal')
    page.fill('#explanation','680 J warms the lamp and surroundings. Energy is conserved but dispersed and less useful.')
    page.click('#callTeacher');page.click('#advance');assert page.evaluate('complete[4]')
    page.click('#teacherBtn');assert page.locator('#advance').is_disabled()
    with page.expect_download() as dl:
        page.click('#download')
    target=ROOT.parent/'work/physics8-offline-test.html';dl.value.save_as(target)
    context.set_offline(True);page.goto('about:blank');page.set_content(target.read_text());page.click('#begin');fit()
    for size in [(1366,768),(1920,1080)]:
        page.set_viewport_size({'width':size[0],'height':size[1]})
        for n in range(5):lab(n)
    assert not errors,errors
    browser.close()
server.shutdown()
print('PASS: all four simulations, corrections, drag/tap controls, conservation, teacher completion, offline download and screen fit.')
