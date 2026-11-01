# A 45-minute classroom activity

**Topic:** Cambridge AS & A Level Physics 8.1 — circuit symbols and diagrams.
**Learning outcomes:** recognise IEC-style symbols; draw complete circuits; distinguish
series and parallel connections; correctly connect meters; use V = IR; explain
junction current and troubleshoot open/short circuits.

## Before students arrive

Open the application on the classroom TV. Use landscape and fullscreen. Load
“Correct meter connections”, run it, and check 0.3 A and 6 V. Select Teacher Mode;
set a three-minute timer. Leave sound off unless it is useful. For competition,
enter student/pair names in Classroom Challenge. It uses a single shared board;
teams take turns while classmates sketch predictions. Do not connect physical
hardware to this simulation.

## 0–5 minutes — Notice and name

Open Symbol Explorer. Ask students to match cell, battery, switch, lamp, resistor,
ammeter and voltmeter to their functions. Point out the long line on a cell is +,
the IEC resistor is rectangular, and a junction has a dot. A crossing without a dot
is not a connection. Use two identification questions to check understanding.

## 5–10 minutes — Build the first complete path

Use Free Build or Mission 1. Invite a student to place a battery and lamp, then tap
terminals to connect both sides. Predict before pressing Run. Remove one wire:
why does the lamp go out? Reconnect it. Explain: a source transfers energy to
charges; current needs a complete conducting path. Charges are not used up.

Switch flow display between conventional current and electrons. Conventional
current in the external circuit goes from + to −; electrons in metal drift the
other way. Inside the source, energy transfer drives charge back against the
potential difference. Arrow speed is illustrative, not electron drift speed.

## 10–17 minutes — Control and measure

Try Missions 2–4: put a switch and ammeter in series, then a voltmeter in parallel
across the lamp. Ask the class to predict each reading before running. Use the
6 V, 20 Ω lamp example: I = V/R = 0.3 A. Open the switch and explain zero sustained
current. Move the voltmeter into series: its ideal infinite resistance opens the
path. Discuss why an ammeter must never be placed across a real supply.

## 17–25 minutes — Series versus parallel

Load Series resistors. Two 100 Ω resistors at 6 V: R_total = 200 Ω, I = 0.030 A,
3 V across each. Load Parallel resistors: both resistors have 6 V, each takes
0.060 A, source current is 0.120 A; equivalent resistance is 50 Ω. Students explain
which quantity is shared in each arrangement. Use Missions 5 and 6 to check this.

Ask: at a junction, how much current leaves compared with the current entering?
Use Kirchhoff’s current law, not the idea that a branch “uses up” current.

## 25–32 minutes — Circuit Detective

Give three minutes per selected case, including discussion:

1. Series voltmeter: replace it with an ammeter in the conducting path.
2. Ammeter across supply: remove that branch and put the meter in series.
3. Reverse LED: remove and reconnect its two wires, anode towards + and cathode
   towards −, keeping the 330 Ω series resistor. Rotation alone preserves wire
   attachments. Expected LED current is about 12.69 mA.

Ask students to state the fault before touching the board and explain why the fix
works. Reveal Explanation after their attempt. A failed solver has no valid meter
readings; it should not be treated as a small current or zero voltage.

## 32–40 minutes — Classroom Challenge

Enter names, assign one of Missions 7–10, and start the three-minute timer.
For many teams, give each pair one turn while others predict on paper. Award 10
points for a validated circuit and use an additional manual award for a clear
explanation. Points are teacher-controlled. Pause stops both timer and simulation;
start resumes them. Next Mission changes the task but retains the circuit so
students can extend it. Reset timer starts a fresh time allowance; Reset scores
clears points without deleting circuits.

Useful questions: What happens if resistance increases? Why does an LED need a
resistor? Does an LDR’s resistance increase or decrease in brighter light? What
extra information would we need to convert resistance into a light level?

## 40–45 minutes — Exit ticket

Students sketch a cell, switch and lamp with an ammeter in series and voltmeter
across the lamp. Label conventional current. Then calculate:

- 6 V across 200 Ω: **I = 0.030 A**.
- 0.030 A for 60 s: **Q = It = 1.8 C**.
- 6 V and 0.030 A: **P = VI = 0.18 W**.

Collect one sentence explaining the difference between an open circuit and a
short circuit. Award explanation points and read the scoreboard.

## Accuracy notes for teaching

This is a **DC steady-state** laboratory. A capacitor is an open circuit after
charging; charging is not animated or calculated. The lamp has constant resistance
here; a real filament’s resistance rises with temperature. Sensor resistance is
set directly, with no temperature/light calibration. Diode models are simplified
forward drops, not real I–V curves. Fuse overloads warn but do not melt
automatically. Explain these limits before asking students to generalise results.
