# CircuitLab: Build, Connect & Discover

Offline, touch-friendly circuit laboratory for Cambridge AS & A Level Physics,
Chapter 8.1. Plain HTML, CSS, JavaScript and SVG; no runtime packages, fonts,
analytics, external services or API keys.

## Run

Open `index.html` in a current Chrome, Edge, Firefox or Safari browser. Keep
`style.css`, `solver.js`, `symbols.js`, and `app.js` alongside it. No build or
installation is needed. If a managed browser blocks local files, use Python 3:

```sh
cd /path/to/efi-ms.elvie/tools/circuitlab
python3 -m http.server 8000
```

Open the local server on the same machine. This works without Internet access.
The server must keep running. Fullscreen may require a user gesture and browser
permission. Local progress belongs to the browser profile and origin; file URL
storage varies by browser, so serving locally is recommended for reliable saves.
No service worker or online first visit is required.

## Use in class

- Choose a part on the left, then tap the board, or drag it from the palette.
- Drag placed parts to move them. Select a part, then Rotate or Delete.
- Tap one terminal circle, then another to connect them. Existing terminals can
  have multiple wires attached. Add a Wire junction where branches should meet.
  Wire crossings **do not connect**. A wire can be selected and deleted.
- Run circuit calculates DC steady state. Adjust the selected source voltage or
  load resistance with its slider. Pause hides readings and stops flow animation.
- Select a switch and use its toggle, or double-tap it. Undo/redo covers board edits.
- Load one of five examples, then experiment. Reset example reloads the most
  recently selected example or detective case; Clear empties the board and is undoable.
- Guided Missions validates ten tasks. The green progress bar records tasks
  completed at least once; current success is always recalculated from the board.
- Detective provides three editable faults: series voltmeter, parallel ammeter,
  reverse LED. Remove/reconnect actual wires or replace the incorrect meter.
- Classroom Challenge uses one shared board. Enter up to 20 names, assign the
  displayed mission verbally, validate circuits, and manually award/remove points.
  Scores stay in participant order. Teacher Mode exposes timer controls, next
  mission and an explanation. Timer reset resets time, not students’ circuits.
- Symbol Explorer includes all 17 builder symbols and an identification quiz.
- Keyboard: R rotates selection, Delete removes, Escape cancels placement or
  connection, Ctrl/Cmd Z undo, Ctrl/Cmd Shift Z redo. Touch/mouse/stylus pointer
  controls do not require keyboard input.

The desktop layout targets a 1920 × 1080 landscape TV. On smaller displays the
page scrolls; controls are also usable at 960 × 600. Sound is opt-in.

## Physics and numerical model

`solver.js` is a small, auditable modified-nodal-analysis solver with partial-pivot
Gaussian elimination. It solves Kirchhoff current constraints and ideal voltage
source constraints together; resistor branches obey Ohm’s law. Conducting islands
have independent references. Floating voltmeters return **undefined**, never a
fictional zero. No leakage resistance is inserted to conceal singular circuits.

A purpose-built engine keeps this plain-file, offline application dependency-free.
It is validated against analytical circuits in `../../tests/solver.test.js`; it is not a
SPICE replacement. Supported models:

| Component | DC model |
|---|---|
| Wires, junction, closed switch | ideal zero-resistance connections |
| Cell, battery, supply | ideal fixed DC voltage; first/left terminal is + |
| Resistor, variable, sensor | selected resistance in Ω, strictly positive |
| Lamp | fixed resistance; glow relative to 1.8 W; not a hot-filament model |
| Ammeter | ideal 0 V branch; signed series current |
| Voltmeter | infinite resistance, no current; signed terminal voltage |
| Capacitor | open circuit at DC steady state; no charging transient |
| Diode | forward 0.7 V + 1 Ω; reverse open |
| LED | forward 1.8 V + 1 Ω; reverse open; warning above 30 mA |
| Fuse | selected small resistance, warning above 1 A; manual opening only |

NTC thermistors and LDRs expose measured resistance, without inventing a
resistance-versus-temperature/light calibration. Diodes have no reverse breakdown,
capacitance or exponential junction model. Up to 10 diodes/LEDs are supported;
operating states are enumerated and checked for consistency. All quantities are SI.
No AC, transient, inductive, electrochemical, thermal or automatic fuse simulation.

Polarity: values use terminal 0 minus terminal 1, and positive component current
flows from terminal 0 to terminal 1. Rotating a component moves its terminals, but
preserves its electrical wire attachments. **Rewire terminals to reverse polarity.**
Negative source power means it supplies energy. Current arrows on wires follow
Kirchhoff’s law; in ideal wire loops there is no unique distribution, so the display
uses a spanning-tree distribution. Electron arrows reverse conventional current;
this represents electron drift in metal wires, not charge carriers in every material.

Direct wire/ammeter shorts across sources stop simulation with no measurements.
Other ideal-source loops with non-unique or inconsistent equations report an error.
A disconnected terminal is reported. An open loop gives zero sustained current.
A series voltmeter blocks current; a parallel ammeter can short a supply or load.
An ammeter bypassing a load causes its calculated zero voltage/current, so inspect
that load if it remains dark. Never transfer short-circuit experiments to real power
supplies without suitable current limiting.

## Validation

Node.js (tested with 24) is needed only for automated numerical tests:

```sh
npm test
```

17 tests cover analytical series/parallel results, power balance, meters, open
switches, shorts, floating readings, capacitors, diode direction/voltage model,
sensors, multiple islands and invalid networks. There is no npm install step.

Browser integration tests use Python Playwright and system Chromium. Install those
development tools if unavailable, then:

```sh
python tests/browser_test.py
```

The test starts and stops its own local server, blocks non-local requests and checks
real touch/mouse wiring, drag, rotate, delete, history, every example, missions,
sliders, switches, teacher controls, faulty circuits, scores, local persistence,
quiz and responsive layout. No test tools are needed to use the application.
See `../../guides/examples.html` for expected readings and `../../guides/classroom.html` for a 45-minute lesson. Run automated test commands from the repository root.
