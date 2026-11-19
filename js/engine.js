// The closed-loop simulator. OWNER: Menna. P1, P2, P3, P4 and My system all call simulate().
// The statement requires our own solver, so this function must be our own work.
import { rk4Step } from './rk4.js';

// Setup for a run. Every module starts from this and changes what it needs.
export function defaultRun() {
  return {
    plant: { type: 'first', K: 1, tau: 1 }, // or { type: 'msd', m, b, k } or { type: 'second', K, zeta, wn }
    Kp: 0, Ki: 0, Kd: 0,
    Ts: 0.001, // sampling time in s; must be a whole number of ms, because h = 1 ms
    tauS: 0, // sensor time constant in s; 0 means a perfect sensor
    uMin: -Infinity, uMax: Infinity,
    antiWindup: false,
    r: 1, // setpoint step
    T: 10, // duration in s
    h: 0.001, // RK4 step in s
  };
}

// Plant equations: returns [dx1/dt, dx2/dt] for state x and input u. Already working.
export function plantDerivative(plant, x, u) {
  if (plant.type === 'first') return [(plant.K * u - x[0]) / plant.tau, 0];
  if (plant.type === 'msd') return [x[1], (u - plant.b * x[1] - plant.k * x[0]) / plant.m];
  const w2 = plant.wn * plant.wn;
  return [x[1], plant.K * w2 * u - 2 * plant.zeta * plant.wn * x[1] - w2 * x[0]];
}

// Runs one closed-loop step response.
// Returns { t, y, ym, u, diverged }: time, true output, sensor reading, control signal, and a flag.
//
// The state is [x1, x2, sensor]. The sensor obeys tauS ym' + ym = y. If tauS is 0 skip it, or you divide by zero.
// Digital PID from the statement, run every Ts:
//   u[k] = Kp e[k] + Ki Ts sum(e[0..k]) + Kd (e[k] - e[k-1]) / Ts
export function simulate(run) {
  // TODO(Menna):
  // 1. Write f(x, u) that returns [plantDerivative(...)[0], plantDerivative(...)[1], sensor derivative].
  // 2. Set state = [0, 0, 0], sum = 0, ePrev = null, u = 0. Set everyK = Math.round(Ts / h).
  // 3. Loop over steps i from 0 to Math.round(T / h) - 1. At every step, ym = state[2] if tauS > 0, otherwise
  //    state[0]. When i is a multiple of everyK, run the controller:
  //    a. e = r - ym.
  //    b. The statement leaves e[-1] undefined. We use e[-1] = e[0]: if ePrev is null, set ePrev = e.
  //       This avoids a huge kick at k = 0. The Arduino code must follow the same rule.
  //    c. newSum = sum + e. The sum includes the current sample, as the statement writes it.
  //    d. raw = Kp e + Ki Ts newSum + Kd (e - ePrev) / Ts. clipped = raw limited to uMin..uMax.
  //    e. Anti-windup: if antiWindup is on and clipped differs from raw, keep the old sum and recompute
  //       raw and clipped with it. Otherwise sum = newSum.
  //    f. u = clipped. ePrev = e.
  // 4. Store t, state[0], ym and u for this step.
  // 5. If |state[0]| > 1000, set diverged = true and stop, so the plot axes survive.
  // 6. state = rk4Step(f, state, u, h). Between samples u stays constant.
  // Do not step the plant at Ts: Euler at h = Ts moves the P-only limit from 0.223 s to 0.200 s.
  return { t: [], y: [], ym: [], u: [], diverged: false };
}

// Keeps every nth sample so plots stay fast. Metrics must use the full arrays. Already working.
export function thin(arr, count = 800) {
  const n = Math.max(1, Math.floor(arr.length / count));
  return arr.filter((_, i) => i % n === 0);
}

// Roots of the PI closed loop on K/(tau s + 1): tau s^2 + (1 + K Kp) s + K Ki.
// Returns { wn, zeta }. Equations: wn = sqrt(K Ki / tau), zeta = (1 + K Kp) / (2 sqrt(tau K Ki))
export function piLoop(K, tau, Kp, Ki) {
  // TODO(Menna): return { wn, zeta } from the equations above. Validation check 2 uses it.
  return { wn: NaN, zeta: NaN };
}

// Largest safe Kd for the first-order plant: 0.9 tau / K. At K Kd / tau >= 1 the statement's digital
// formula diverges at every small Ts, for a reason nobody can explain as physics in the demo.
export function kdMax(K, tau) {
  // TODO(Menna): return the value above. P1 and P2 use it as the slider's maximum.
  return NaN;
}
