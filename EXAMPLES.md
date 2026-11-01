# Editable example circuits and reference readings

Choose an example in the selector below the board. All are actual networks passed
to the solver. Values below are magnitudes; signs depend on terminal orientation.

| Example | Network | Expected readings |
|---|---|---|
| One lamp | 6 V source; 20 Ω lamp | 0.300 A; lamp 6 V, 1.800 W |
| Series resistors | 6 V; 100 Ω + 100 Ω | 0.030 A throughout; 3 V per resistor; 200 Ω equivalent |
| Parallel resistors | 6 V; two 100 Ω branches | 0.060 A per branch; source 0.120 A; 6 V per branch; 50 Ω equivalent |
| Correct meter connections | 6 V; ideal ammeter in series with 20 Ω lamp; ideal voltmeter across lamp | ammeter 0.300 A; voltmeter 6 V; voltmeter current 0 A |
| LED + protective resistor | 6 V; 330 Ω + LED (1.8 V + 1 Ω) | I = (6 − 1.8)/331 = 0.01268882 A; LED ≈ 1.812689 V; resistor ≈ 4.187311 V |

In Detective, the first case puts an ideal voltmeter in series: current is 0 A,
and the meter reads the 6 V source potential difference. The second case shorts a
source through an ammeter and is deliberately rejected. The third reverses the LED:
current is 0 A. Correcting the faults produces the corresponding values above.

Numerical references are asserted in `tests/solver.test.js`. Actual example
creation and browser interactions are exercised by `tests/browser_test.py`.
