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
  const { plant, Kp, Ki, Kd, Ts, tauS, uMin, uMax, antiWindup, r, T, h } = run;

  // 1. f(x, u): plant derivatives + sensor derivative
  const f = (x, uIn) => {
    const d = plantDerivative(plant, x, uIn);
    const dSensor = tauS > 0 ? (x[0] - x[2]) / tauS : 0;
    return [d[0], d[1], dSensor];
  };

  // 2. Initial values
  let state = [0, 0, 0];
  let sum = 0;
  let ePrev = null;
  let u = 0;
  const everyK = Math.max(1, Math.round(Ts / h));

  const tArr = [], yArr = [], ymArr = [], uArr = [];
  let diverged = false;

  // 3. Main loop
  const steps = Math.round(T / h);
  for (let i = 0; i < steps; i++) {
    const ym = tauS > 0 ? state[2] : state[0];

    if (i % everyK === 0) {
      const e = r - ym;// a
      if (ePrev === null) ePrev = e;// b. e[-1] = e[0]
      const newSum = sum + e;// c
      const dTerm = Kd * (e - ePrev) / Ts;
      let raw = Kp * e + Ki * Ts * newSum + dTerm;// d
      let clipped = Math.min(uMax, Math.max(uMin, raw));
      if (antiWindup && clipped !== raw) {// e. keep the old sum
        raw = Kp * e + Ki * Ts * sum + dTerm;
        clipped = Math.min(uMax, Math.max(uMin, raw));
      } else {
        sum = newSum;
      }
      u = clipped;// f
      ePrev = e;
    }

    // 4. Store this step
    tArr.push(i * h);
    yArr.push(state[0]);
    ymArr.push(ym);
    uArr.push(u);

    // 5. Stop if it blows up
    if (Math.abs(state[0]) > 1000) {
      diverged = true;
      break;
    }

    // 6. Move the plant forward by one RK4 step (u held constant)
    state = rk4Step(f, state, u, h);
  }

  return { t: tArr, y: yArr, ym: ymArr, u: uArr, diverged };
}

// Keeps every nth sample so plots stay fast. Metrics must use the full arrays. Already working.
export function thin(arr, count = 800) {
  const n = Math.max(1, Math.floor(arr.length / count));
  return arr.filter((_, i) => i % n === 0);
}

// Roots of the PI closed loop on K/(tau s + 1): tau s^2 + (1 + K Kp) s + K Ki.
// Returns { wn, zeta }. Equations: wn = sqrt(K Ki / tau), zeta = (1 + K Kp) / (2 sqrt(tau K Ki))
export function piLoop(K, tau, Kp, Ki) {
  const wn = Math.sqrt(K * Ki / tau);
  const zeta = (1 + K * Kp) / (2 * Math.sqrt(tau * K * Ki));
  return { wn, zeta };
}

// Largest safe Kd for the first-order plant: 0.9 tau / K. At K Kd / tau >= 1 the statement's digital
// formula diverges at every small Ts, for a reason nobody can explain as physics in the demo.
export function kdMax(K, tau) {
  return 0.9 * tau / K;
}
