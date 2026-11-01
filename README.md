# Elvie Learning Lab

A static website for HTML classroom tools. Includes the full CircuitLab application,
HTML teaching guides, a searchable catalog, offline HTML downloads, and a personal
browser library for importing self-contained tools.

## Run

Open `index.html`, or use a local server for reliable browser storage:

```sh
python scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

Open the local server in a browser. There are no runtime dependencies or external
assets. Python 3 is the only build requirement. Node.js 24 runs numerical tests.

- Homepage: `index.html`
- CircuitLab: `tools/circuitlab/index.html`
- Getting started: `guides/getting-started.html`
- 45-minute lesson: `guides/classroom.html`
- Tested circuits: `guides/examples.html`
- Publishing and adding tools: `guides/publishing.html`

The build outputs `dist/` for hosting and `downloads/` with self-contained HTML
tools plus original-file ZIPs. Do not commit generated folders.

## Add a public tool

```sh
python scripts/add_tool.py /path/to/tool.html \
  --id wave-lab --title "Wave Lab" \
  --description "Explore wave properties." --category Physics
```

A directory containing `index.html` and local assets is also accepted. Use ordinary
local JavaScript/CSS scripts with double-quoted paths for the standalone bundler.
CircuitLab is fully bundled and tested offline. Tools using dynamic imports,
external requests, or runtime-loaded assets require their own offline validation.
Edit existing tool files directly, then rebuild to update downloads.

## Publish

The GitHub Actions workflow at `.github/workflows/pages.yml` tests and publishes
`dist/` on pushes to main. A repository administrator must first enable **Settings →
Pages → Source: GitHub Actions**. The workflow does not itself enable Pages. Check
its deployment result before claiming a live site. Alternatively upload `dist/`
to a static host. No hosting tokens belong in client-side HTML.

## Validate

```sh
npm test
python scripts/build_site.py
python tests/site_test.py
python tests/tool_pipeline_test.py
python tests/site_browser_test.py
python tests/browser_test.py
```

Browser tests need Python Playwright and system Chromium (`/usr/bin/chromium`).
These are development dependencies only. They start their own temporary local
servers. Static checks ensure all HTML links resolve and downloads are bundled.
Numerical tests exercise 17 circuit cases; integration tests cover touchscreen
controls, all twenty mission validators, the catalog, imports, downloads and layouts.

## Storage and privacy

Public catalog files are deployed together. Personal uploads are saved only in the
visitor’s IndexedDB; CircuitLab progress is saved in localStorage. These are not
public uploads or shared classroom records. No account or database backend exists.
Visitors can download and remove imports. Clearing browser data can remove local
progress, so retain original files. Sandboxed personal previews cannot access the
library origin and restrict external resource loading; only import trusted files.

CircuitLab uses an explicitly labelled DC steady-state model. See the in-app
model panel and `tools/circuitlab/README.md` for its scientific limitations.
