// The three validation checks from Homework 2. OWNER: Menna.
// They all use K/(tau s + 1) with K = tau = 1 and the u limit OFF: Kp = 9 asks for u = 9 at t = 0,
// and with a limit of 1 the measured time constant would be 0.84 s instead of 0.1 s.
import { defaultRun, simulate, piLoop } from './engine.js';

const plant = { type: 'first', K: 1, tau: 1 };

function run(Kp, Ki, T) {
  return simulate({ ...defaultRun(), plant, Kp, Ki, T });
}

// Time for y to reach 63.2% of its final value.
function closedLoopTau() {
  const { t, y } = run(9, 0, 3);
  if (y.length === 0) return NaN;
  const final = y[y.length - 1];
  const i = y.findIndex(v => v >= 0.632 * final);
  return t[i];
}

// Steady-state error in percent for PI gains. Run for at least 10 slow time constants and at least 8 s.
// Returns NaN while the engine is a TODO, and null if the loop diverges or would need over 60 s ("not applicable").
export function piSteadyErrorPct(Kp, Ki) {
  const slow = (1 + Kp) / Ki; // the slow closed-loop time constant for K = tau = 1
  if (10 * slow > 60) return null;
  const r = run(Kp, Ki, Math.max(8, 10 * slow));
  if (r.y.length === 0) return NaN;
  if (r.diverged) return null;
  return Math.abs(1 - r.y[r.y.length - 1]) * 100;
}

export function controlChecks(currentGains) {
  return [
    { check: 1, owner: 'Menna', label: 'P only, K<sub>p</sub> = 9: closed-loop &tau;', expected: 0.1, tol: 0.002, unit: 's', value: closedLoopTau },
    { check: 1, owner: 'Menna', label: 'P only, K<sub>p</sub> = 9: steady-state error', expected: 10, tol: 0.1, unit: '%', value: () => { const { y } = run(9, 0, 3); return y.length ? (1 - y[y.length - 1]) * 100 : NaN; } },
    { check: 2, owner: 'Menna', label: 'PI, K<sub>p</sub> = K<sub>i</sub> = 1: &omega;<sub>n</sub> from the roots', expected: 1, tol: 0.001, unit: 'rad/s', value: () => piLoop(1, 1, 1, 1).wn },
    { check: 2, owner: 'Menna', label: 'PI, K<sub>p</sub> = K<sub>i</sub> = 1: &zeta; from the roots', expected: 1, tol: 0.001, value: () => piLoop(1, 1, 1, 1).zeta },
    { check: 2, owner: 'Menna', label: 'PI, K<sub>p</sub> = K<sub>i</sub> = 1: curve y(1 s), since the loop is exactly 1/(s + 1)', expected: 0.632, tol: 0.002, value: () => { const { y } = run(1, 1, 2); return y.length ? y[1000] : NaN; } },
    { check: 3, owner: 'Menna', label: `Any PI: error for K<sub>p</sub> = ${currentGains.Kp}, K<sub>i</sub> = ${currentGains.Ki}`, expected: 0, tol: 0.5, unit: '%', value: () => piSteadyErrorPct(currentGains.Kp, currentGains.Ki) },
  ];
}
