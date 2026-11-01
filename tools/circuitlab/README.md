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
- CircuitLab has one navigation item: Mission, with 24 tasks.
- Next is locked until the current circuit is verified; advancing clears the board,
  selection, undo/redo history and timer while preserving completed-mission progress.
- Back always works without completing the current task and opens the previous
  mission with a clean board. At Mission 1, Back stays available and reports the boundary.
- Hint shows a faint guide; Show answer gives a full labelled circuit picture.
- Teacher tools provide a timer, Back, gated Next and Show answer.
- Five example circuits remain available from the board’s example selector.
- The 17-part palette retains IEC symbols, and the board has 3D parts/Symbols views.
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
sliders, switches, teacher controls, mission progression, local persistence
and responsive layout. No test tools are needed to use the application.
See `../../guides/examples.html` for expected readings and `../../guides/classroom.html` for a 45-minute lesson. Run automated test commands from the repository root.

## Component views

Placed components use a shaded 3D-style SVG view by default. The palette keeps IEC
symbols; choose Symbols on the board to compare circuit diagrams. The preference
is saved locally. The inspector’s Circuit symbol section shows the matching symbol.
Meter displays and lamp/LED glow use solver results and clear while paused. These
are depth illustrations on the existing flat workbench, with unchanged terminals,
rotation controls and DC models; there is no 3D camera or WebGL dependency.

Run `python tests/physical_parts_test.py` from the repository root for appearance,
view persistence, drop behavior, readings and 375/960/1920 layout checks.

## Hints and answers

Hint shows the required IEC symbols and a first connection as a faint board guide.
Show answer opens a complete labelled circuit picture; the Connections fold lists
terminal pairs (for example, 1a to 2a). All 24 missions have their own validated
reference circuit. Teacher Show answer opens the picture too.
Guides never change the student's circuit, undo history, readings or points, and
clear when the task changes. The twenty-four reference circuits are checked against the
real mission validator in `tests/mission_help_test.py`.

## Rotate and stretch wires

Tap a placed part, then its on-board Rotate button (90° steps). The labelled
Rotate toolbar button and R key also work in both 3D parts and Symbols views.
Wires stay attached to the same electrical terminals during rotation.

The Wire palette button selects the wiring tool rather than placing small wire
pieces. Drag from one terminal dot to another to create a complete wire of any needed
length. Tapping the two dots still works. A wire snaps only to actual terminals;
dropping in empty space cancels and leaves existing connections intact.

Tap a wire to reveal its handles. Drag either end to another terminal to reconnect
it, or drag the middle handle into empty space to stretch or shorten the route.
Auto route in the wire settings removes the manual bend. Moving a part also
resizes all attached wires. Wire length changes the layout only: wires remain
ideal, zero-resistance conductors in the DC model. Undo/redo and local saves cover
wire reconnections and route edits. Wire crossings remain unconnected.

`python tests/wire_gestures_test.py` checks actual mouse/touch gestures, rotation,
stretch/shorten, reconnect, cancellation, history, persistence and layout sizes.

## Mission sequence

1–10: lamp, switch, series ammeter, parallel voltmeter, series resistors, parallel
resistors, variable resistance, LED protection, sensing and combined meters.
11–24: Ohm’s law, reduced current, a single cell, series lamps, parallel lamps,
LDR tuning, thermistor resistance, forward diode, fuse and the final combined circuit.

`tests/mission_course_test.py` checks every solution and rejects broken circuits.
`tests/mission_progress_test.py` checks gated Next, unrestricted Back, clear-board
transitions, progress retention and migration of old saves to mission-only navigation.

Missions 21–24 add unequal series voltage sharing, unequal parallel branch currents,
a switched LED and a final two-meter measurement check.
