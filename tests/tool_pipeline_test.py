"""Exercise the catalog-addition workflow in an isolated copy, preserving the real catalog."""
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
with TemporaryDirectory() as temp:
 base=Path(temp);copy=base/'project'
 shutil.copytree(ROOT,copy,ignore=shutil.ignore_patterns('.git','dist','downloads','__pycache__','node_modules'))
 tool=base/'sample.html';tool.write_text('<!doctype html><title>Test lesson</title><h1>Sample</h1>')
 cmd=[sys.executable,str(copy/'scripts/add_tool.py'),str(tool),'--id','test-lesson','--title','Test lesson','--description','A test tool','--category','Maths']
 first=subprocess.run(cmd,capture_output=True,text=True);assert first.returncode==0,first.stderr
 assert (copy/'tools/test-lesson/index.html').exists()
 assert (copy/'dist/downloads/test-lesson.html').exists()
 assert 'Maths' in (copy/'site-assets/catalog.js').read_text()
 before=(copy/'site-assets/catalog.js').read_text()
 second=subprocess.run(cmd,capture_output=True,text=True);assert second.returncode!=0
 assert (copy/'site-assets/catalog.js').read_text()==before
 bad=cmd.copy();bad[bad.index('test-lesson')]='../escape'
 assert subprocess.run(bad,capture_output=True).returncode!=0
print('PASS: adding a tool copies HTML, updates catalog and builds downloads; duplicates and invalid IDs preserve existing tools.')
