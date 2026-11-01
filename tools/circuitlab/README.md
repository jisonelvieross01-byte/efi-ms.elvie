# CircuitLab: Build, Connect & Discover

An offline, touch-friendly introduction to Cambridge Physics circuit symbols and
diagrams. Plain HTML, CSS, JavaScript and SVG; no framework or external assets.

## Start

Open `index.html` in this folder, or use the repository website. For a local server:

```sh
cd /path/to/efi-ms.elvie
python scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

The standalone HTML in `downloads/circuitlab.html` includes all required assets.
No installation or Internet connection is needed for classroom use.

## Simple question course

There are **25 questions**: question 1 is a teacher demonstration, followed by 24
student tasks. The teacher starts with a cell, lamp and one wire already placed;
joining the last wire lights the lamp. Each question has **two minutes**.

Students recognise symbols and make diagrams. They do not need to calculate or
adjust voltage, resistance, current or charge. Settings sliders and formula tasks
are removed. Component values are safe presets; optional measurements remain in
the folded Readings section. All 17 library symbols remain available.

1. Teacher demo — finish the cell-and-lamp loop.
2. Cell and lamp.
3. Battery and lamp.
4. Closed switch.
5. Open switch.
6. One resistor.
7. Resistor and lamp.
8. Variable resistor.
9. Series ammeter.
10. Parallel voltmeter.
11. Two series lamps.
12. Two parallel lamp branches.
13. Fuse.
14. Diode.
15. LED with a protective resistor.
16. Thermistor.
17. LDR.
18. Capacitor.
19. Junction dot.
20. DC power supply.
21. Rotate a symbol.
22. Switch, resistor and lamp.
23. Ammeter with two series lamps.
24. Both meters with a lamp.
25. Final diagram: lamp, switch and both meters.

## Controls and help

- Tap a library part, then tap the board; or drag it into place.
- Tap a part and use Rotate; R also turns it by 90°. Wires remain attached.
- Drag from one terminal dot to another, or tap both dots, to make a wire.
- The Wire library button selects continuous wiring, rather than placing short pieces.
- Select a wire: drag an end to reconnect, or its middle handle to change its route.
- Crossing wires do not join. Use a junction or shared terminal to create branches.
- Double-tap a switch, or use its settings button, to open or close it.
- Undo, redo, clear and delete work with mouse, touch and stylus.
- The library uses IEC symbols. The board can show 3D-style parts or Symbols.

Hint shows a faint guide. **Show answer opens the complete labelled circuit
immediately**, including a folded list of terminal connections. There are no
dances, punishments, PINs, approval steps or viewing delays. Looking at an answer
does not complete the student's question.

Start on the board, or Run, starts a 02:00 countdown. Correct circuits stop time and
unlock Next. A congratulations card confirms the answer and awards one original
badge per question; repeated checks do not award duplicate progress. View circuit
keeps the work on screen; Next question starts a clean student board. Back remains
available without finishing. Returning to question 1 prepares the teacher demo.

Timeout simply stops the attempt. Show answer still opens immediately, and Try
again or Run starts another two-minute attempt. There are no penalties. Simulation
Pause leaves the clock running; teacher timer controls can pause/reset it. Active
deadlines survive reloads. Progress is stored in the browser; the former numeric
course is kept in a separate local backup when migrating to this simpler course.

## Accurate model, simple tasks

The DC solver uses modified nodal analysis and partial-pivot elimination to satisfy
Kirchhoff's laws. Wires and meters are ideal. Lamps use a labelled fixed resistance;
NTC/LDR resistance is preset without temperature/light calibration. Capacitors are
open at DC steady state; no charging animation is calculated. Diodes use a 0.7 V
forward drop plus 1 Ω; LEDs use 1.8 V plus 1 Ω. Fuse overloads warn but do not melt
fuses automatically. No AC, transients or thermal dynamics are simulated.

Question validation checks correct parts and connections, not exact numerical
readings. Open-switch and capacitor diagrams may correctly have zero sustained
current. Their topology is checked separately; this never invents measurements.
Short circuits and unsolvable ideal-source loops report problems without fabricated
readings. Negative readings use the opposite terminal polarity. All quantities use SI.

## Validation

From the repository root:

```sh
npm test
python scripts/build_site.py
python tests/site_test.py
python tests/tool_pipeline_test.py
python tests/mission_course_test.py
python tests/mission_help_test.py
python tests/mission_progress_test.py
python tests/mission_clock_test.py
python tests/completion_popup_test.py
python tests/browser_test.py
python tests/wire_gestures_test.py
python tests/physical_parts_test.py
python tests/site_browser_test.py
python tests/cached_assets_test.py
```

Node runs 17 analytical circuit tests. Python build/static tests need no packages.
Browser tests use Python Playwright and system Chromium as development tools only.
They cover all 25 diagrams, broken connections, no numeric targets/settings,
immediate answers, the real teacher demo, reward correctness, two-minute timeouts,
save migration, touch wiring, rotation and 375/960/1920 layouts.
