"""Touch interactions, complete scoring flow and screen-fit checks for Space Explorers."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/tools/space-explorers/index.html'
def fits(page,selector):
 result=page.locator(selector).evaluate('(el)=>({height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth})')
 assert result['scroll']<=result['height']+2,(selector,result)
 assert result['scrollWidth']<=result['width']+2,(selector,result)
def svg_point(page,selector,x,y):
 return page.locator(selector).evaluate('(el,xy)=>{let p=el.createSVGPoint();p.x=xy[0];p.y=xy[1];let q=p.matrixTransform(el.getScreenCTM());return {x:q.x,y:q.y}}',[x,y])
def drag(page,selector,start,end):
 a=svg_point(page,selector,*start);b=svg_point(page,selector,*end)
 page.mouse.move(a['x'],a['y']);page.mouse.down();page.mouse.move(b['x'],b['y'],steps=10);page.mouse.up()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1280,'height':720},has_touch=True)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.select_option('#teamCount','8')
 for i in range(8):page.locator('#names input').nth(i).fill(f'Astronaut Crew {i+1}')
 fits(page,'#setup .modal');fits(page,'.briefing-content');fits(page,'.briefing-art')
 page.locator('#startBtn').tap();assert page.locator('.team').count()==8
 for width,height in [(1920,1080),(1280,720),(1366,768),(1024,768),(3840,2160)]:
  page.set_viewport_size({'width':width,'height':height});page.evaluate('fitStage()')
  assert page.evaluate('document.documentElement.scrollHeight===innerHeight')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,height,page.evaluate('document.documentElement.scrollWidth'))
  fits(page,'#simulation');fits(page,'.question')
 page.set_viewport_size({'width':1280,'height':720});page.evaluate('fitStage()')
 # Touch dragging uses SVG screen coordinates even when the whole console scales.
 drag(page,'#gravitySVG',(180,65),(500,90));assert page.evaluate('S.world')==1
 page.locator('#dropBtn').tap();assert '2.50 s' in page.locator('#dropInfo').text_content()
 page.locator('#teacherBtn').tap();fits(page,'#teacher .modal');page.locator('[data-close=teacher]').tap()
 page.locator('#guideBtn').tap()
 for i in range(4):page.locator('[data-guide]').nth(i).tap();fits(page,'#guide .modal')
 page.locator('[data-close=guide]').tap()
 # Inspect every question and solution for overflowing or clipped controls.
 for i in range(30):
  page.evaluate('(i)=>{S.i=i;S.checked=false;S.scored=false;S.answers=[];S.pick=null;render()}',i)
  fits(page,'#simulation');fits(page,'.question')
  page.evaluate('()=>{let q=Q[S.i];S.pick=q.options?q.correct:null;S.answers=q.options?[]:q.correct.map(String);document.querySelector("#checkBtn").click()}')
  fits(page,'#simulation');fits(page,'.question')
 # Planet distance dragging, race preset and pause.
 page.evaluate('()=>{S.i=5;S.checked=false;S.scored=false;S.animate=false;render()}')
 point=page.locator('#planetA').evaluate('el=>{let p=el.ownerSVGElement.createSVGPoint();let q=p.matrixTransform(el.transform.baseVal.consolidate().matrix);return {x:q.x,y:q.y}}')
 drag(page,'#orbitSVG',(point['x'],point['y']),(655,220))
 assert page.evaluate('S.a')==2.5
 page.locator('#raceBtn').tap();assert page.evaluate('S.a===0.7&&S.b===2.2&&S.animate')
 page.locator('#orbitPause').tap();before=page.locator('#planetA').get_attribute('transform');page.wait_for_timeout(120)
 assert page.locator('#planetA').get_attribute('transform')==before
 page.locator('#orbitPause').tap()
 # Formation controls and tide presets.
 page.evaluate('()=>{S.i=8;render()}');page.locator('[data-stage="2"]').tap()
 assert 'Sun and planets' in page.locator('#formationSVG').text_content()
 page.evaluate('()=>{S.i=10;render()}');page.locator('#springBtn').tap();spring=page.locator('#tideRead').inner_text()
 assert 'Spring tides' in spring and '4.4 m' in spring
 page.locator('#neapBtn').tap();assert 'Neap tides' in page.locator('#tideRead').inner_text()
 drag(page,'#tideSVG',(430,80),(585,235));assert page.evaluate('S.moon')==0
 # Thrust changes speed; releasing it leaves the craft coasting.
 page.evaluate('()=>{S.i=15;S.animate=true;render()}')
 box=page.locator('#thrustBtn').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
 page.mouse.down();page.wait_for_timeout(350);page.mouse.up()
 speed=page.evaluate('ship.v');assert speed>0
 page.wait_for_timeout(200);assert abs(page.evaluate('ship.v')-speed)<0.001
 # A complete game through actual choices, number-pad buttons, teacher checking and NEXT.
 key=[[49],[8],[124],0,2,1,0,1,1,0,0,1,1,[4.8],[3],[98],1,1,[5],0,[4.8],[49.6],0,1,[4.8],0,0,[2],1,[49,8]]
 page.evaluate('()=>{S.i=0;S.done=false;S.checked=false;S.scored=false;S.records=[];S.scores=S.names.map(()=>0);S.team=0;S.answers=[];S.pick=null;render()}')
 for i,answer in enumerate(key):
  assert page.locator('#nextBtn').is_disabled()
  if isinstance(answer,list):
   for j,value in enumerate(answer):
    page.locator('#answers .number-button').nth(j).tap();fits(page,'#keypadModal .modal')
    for c in str(value):page.get_by_role('button',name=c,exact=True).tap()
    page.locator('#keyDone').tap()
  else:page.locator('#answers .options button').nth(answer).tap()
  page.locator('#checkBtn').tap();assert page.evaluate('correct()')
  fits(page,'.question');page.locator('#awardBtn').tap()
  page.evaluate('document.querySelector("#awardBtn").click()')
  assert page.evaluate('S.records.length')==i+1
  page.locator('#nextBtn').tap()
 assert page.evaluate('S.done&&S.records.length===30&&S.scores.reduce((a,b)=>a+b,0)===40')
 fits(page,'#finish');page.locator('#endGuide').tap();fits(page,'#guide .modal');page.locator('[data-close=guide]').tap()
 page.reload();fits(page,'#setup .modal');page.locator('#resumeBtn').tap();assert page.locator('#finish').is_visible()
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: all 30 challenges and solutions fit; 8-team overlays; five display sizes; gravity/orbit/tide dragging; drop/race/formation/thrust controls; complete 40-point game; saved resume; no script errors or external requests.')
