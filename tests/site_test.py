"""Static build/link validation; no third-party dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re
ROOT=Path(__file__).resolve().parents[1]/'dist'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ['href','src'] and v:self.links.append(v)
assert (ROOT/'index.html').is_file(),'Build the website first.'
count=0
for file in ROOT.rglob('*.html'):
 parser=Links();parser.feed(file.read_text())
 for link in parser.links:
  url=urlsplit(link)
  if url.scheme or url.netloc or not url.path:continue
  target=(file.parent/unquote(url.path)).resolve()
  assert target.is_relative_to(ROOT.resolve()),(file,link,'escapes build')
  assert target.exists(),(file,link,'broken link')
 count+=1
for path in ['site-assets/site.js','site-assets/site.css','site-assets/catalog.js','downloads/circuitlab.html','downloads/circuitlab.zip','.nojekyll']:
 assert (ROOT/path).is_file(),path
standalone=(ROOT/'downloads/circuitlab.html').read_text()
assert 'CircuitSolver' in standalone and 'const PARTS' in standalone
assert not re.search(r'<script\b[^>]*\bsrc=',standalone)
assert not re.search(r'<link\b[^>]*href=',standalone)
print(f'PASS: {count} HTML pages; all local links resolve; standalone CircuitLab includes solver, symbols, styles and interaction code.')
