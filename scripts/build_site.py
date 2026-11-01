#!/usr/bin/env python3
"""Build an entirely static site and standalone downloadable HTML tools."""
from pathlib import Path
import json,re,shutil,zipfile
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
def catalog():
 text=(ROOT/'site-assets/catalog.js').read_text()
 return json.loads(text.split('window.TOOL_CATALOG =',1)[1].strip().removesuffix(';'))
def inline_html(entry):
 source=ROOT/entry['path']; base=source.parent; text=source.read_text()
 def local(name):
  p=(base/name).resolve()
  if not p.is_relative_to(base.resolve()):raise ValueError('Asset escapes tool directory: '+name)
  return p.read_text()
 def style(m):return '<style>'+local(m[1])+'</style>'
 def script(m):return '<script>'+local(m[1]).replace('</script','<\\/script')+'</script>'
 text=re.sub(r'<link\b[^>]*href="([^"?]+\.css)"[^>]*>',style,text)
 text=re.sub(r'<script\b[^>]*src="([^"?]+\.js)"[^>]*>\s*</script>',script,text)
 return text

def build():
 if DIST.exists():shutil.rmtree(DIST)
 DIST.mkdir();(DIST/'.nojekyll').touch()
 for p in ['index.html','circuitlab.html','site-assets','tools','guides']:
  src=ROOT/p
  if src.is_dir():shutil.copytree(src,DIST/p)
  elif src.exists():shutil.copy2(src,DIST/p)
 downloads=ROOT/'downloads'
 if downloads.exists():shutil.rmtree(downloads)
 downloads.mkdir()
 for entry in catalog():
  standalone=inline_html(entry)
  (downloads/(entry['id']+'.html')).write_text(standalone)
  with zipfile.ZipFile(downloads/(entry['id']+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
   base=(ROOT/entry['path']).parent
   for p in base.rglob('*'):
    if p.is_file():z.write(p,entry['id']+'/'+str(p.relative_to(base)))
 shutil.copytree(downloads,DIST/'downloads')
 print(f'Built {len(catalog())} tool(s) and the website in {DIST}')
if __name__=='__main__':build()
