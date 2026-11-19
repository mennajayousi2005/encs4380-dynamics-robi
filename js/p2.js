// P2, a slow sensor in the loop. OWNER: Nada.
// The page wiring below already works once Menna's engine is in. Nada's functions are marked TODO(Nada).
import { renderNav, addSlider, addReadout, addButtons, lockable, fmt, addTodoBanner } from './ui.js';
import { draw, line, vline, linspace } from './plot.js';
import { addPredict } from './predict.js';
import { readMetrics } from './metrics.js';
import { defaultRun, simulate, thin, kdMax } from './engine.js';
import { MY_SYSTEM } from './my_system.js';

// The tauS where the loop reaches steady oscillation, from Routh, for first order with Kd = 0.
// Equation: tauS_crit = tau (1 + K Kp) / (tau K Ki - 1 - K Kp)
export function tauSCrit(K, tau, Kp, Ki, Kd) {

  //check if any input is not a valid finite number
  if (!Number.isFinite(K) || !Number.isFinite(tau) || !Number.isFinite(Kp) || !Number.isFinite(Ki) || !Number.isFinite(Kd))
    return null;

  if (Kd !== 0)
    return null;
  if (tau <= 0)
    return null;

  const num = tau * (1 + K * Kp);
  const den = tau * K * Ki - 1 - K * Kp;
  if (num <= 0 || den <= 0) {
    return null;
  }

  const tauCrit = num / den;

  if (Number.isFinite(tauCrit)) {
    return tauCrit;
  } else {
    return null;
  }
}


// Describes a run in words, for the status line under the plot.
export function describeRun(res, final) {

  // Check if the simulation has valid data
  if (!res || !Array.isArray(res.y) || !Array.isArray(res.t) || res.y.length === 0 || res.y.length !== res.t.length || !Number.isFinite(final)) {
    return 'No data.';
  }
  if (res.diverged) {
    return 'Unstable: the oscillation grows.';
  }
  const t = res.t;
  const y = res.y;
  const tEnd = t[t.length - 1];

  if (!Number.isFinite(tEnd)) {
    return 'No data.';
  }
  let min = Infinity;
  let max = -Infinity;
  let hasData = false;

  for (let i = 0; i < y.length; i++) {
    if (!Number.isFinite(t[i])) {
      return 'No data.';
    }
    if (!Number.isFinite(y[i])) {
      return 'Unstable: the oscillation grows.';
    }

    if (t[i] >= tEnd - 2) {
      if (y[i] < min) min = y[i];
      if (y[i] > max) max = y[i];

      hasData = true;
    }
  }
  if (!hasData) {
    return 'No data.';
  }

  //calculate the output variation
  const swing = max - min;

  if (!Number.isFinite(swing)) {
    return 'Unstable: the oscillation grows.';
  }
  const band = 0.02 * Math.max(Math.abs(final), 1e-9);
  if (swing > band) {
    return 'Still oscillating at the end of the run.';
  }

  return 'Settles.';
}



renderNav();
const banner = addTodoBanner(document.querySelector('main'), 'Waiting for simulate() from Menna, and TODO(Nada) in js/p2.js.');
const controls = document.getElementById('controls');
let K = 1;
let tau = 1;
const tauS = addSlider(controls, { label: 'Sensor &tau;<sub>s</sub>', min: 0, max: 0.5, value: 0.1, step: 0.005, unit: 's', onInput: render });
const Kp = addSlider(controls, { label: 'K<sub>p</sub>', min: 0, max: 30, value: 9, step: 0.5, onInput: render });
const Ki = addSlider(controls, { label: 'K<sub>i</sub>', min: 0, max: 100, value: 50, step: 1, onInput: render });
const Kd = addSlider(controls, { label: 'K<sub>d</sub>', min: 0, max: 0.9, value: 0, step: 0.05, onInput: render });
function applyKdLimit() {
  const limit = kdMax(K, tau);
  if (Number.isFinite(limit)) Kd.setRange(0, limit, limit / 20);
}
applyKdLimit();

const out = document.getElementById('readouts');
const rPlant = addReadout(out, 'Plant');
const rTrue = addReadout(out, 'True overshoot');
const rSensor = addReadout(out, 'What the sensor says');
const rCrit = addReadout(out, 'Stability limit &tau;<sub>s</sub>');
const status = document.getElementById('status');

function setPlant(newK, newTau) {
  K = newK;
  tau = newTau;
  Kp.setRange(0, 30, 0.5);
  Ki.setRange(0, 100, 1);
  applyKdLimit();
}

// The preset gains are for K = tau = 1 and go unstable on a fast motor, so the button also loads our designed gains.
function useMotorGains() {
  Kp.setRange(0, 3 * MY_SYSTEM.Kp, MY_SYSTEM.Kp / 50);
  Kp.set(MY_SYSTEM.Kp);
  Ki.setRange(0, 3 * MY_SYSTEM.Ki, MY_SYSTEM.Ki / 50);
  Ki.set(MY_SYSTEM.Ki);
  Kd.set(0);
}

// Puts our Micromouse motor and its gains from js/my_system.js into the loop.
function useMotor() {
  if (![MY_SYSTEM.K, MY_SYSTEM.tau, MY_SYSTEM.Kp, MY_SYSTEM.Ki].every(Number.isFinite)) {
    status.textContent = 'Fill in K, tau, Kp and Ki in js/my_system.js first.';
    return;
  }
  setPlant(MY_SYSTEM.K, MY_SYSTEM.tau);
  useMotorGains();
  tauS.setRange(0, 0.5);
  tauS.set(0); // start from a perfect sensor, so that sliding tauS up shows the lesson on our motor
  render();
}

const presets = addButtons(document.getElementById('presets'), [
  { label: 'PI 9, 50: reaches oscillation', onClick: () => { setPlant(1, 1); Kp.set(9); Ki.set(50); Kd.set(0); tauS.setRange(0, 0.5); tauS.set(0.1); render(); } },
  { label: 'P only, Kp = 9: the sensor hides it', onClick: () => { setPlant(1, 1); Kp.set(9); Ki.set(0); Kd.set(0); tauS.setRange(0, 5); tauS.set(1); render(); } },
  { label: 'Use our motor', onClick: useMotor },
]);

function overshoot(arr, final) {
  return readMetrics(arr.map((_, i) => i), arr, final).overshoot;
}

function render() {
  const base = { ...defaultRun(), plant: { type: 'first', K, tau }, Kp: Kp.value, Ki: Ki.value, Kd: Kd.value };
  const T = Math.min(30, Math.max(4, 30 * tau, 60 * tauS.value));
  const res = simulate({ ...base, tauS: tauS.value, T });
  banner.show(res.t.length === 0 || Number.isNaN(tauSCrit(1, 1, 9, 50, 0)));
  const t = thin(res.t);
  draw('output', [
    line(t, thin(res.y), 'True output y'),
    line(t, thin(res.ym), 'What the sensor reports', { line: { dash: 'dash' } }),
  ], { xaxis: { title: 'Time (s)', range: [0, Math.max(10 * tau, 6 * tauS.value)] }, yaxis: { title: 'Output', range: res.diverged ? [-5, 5] : undefined } });

  rPlant.set(`K = ${fmt(K, 3)}, τ = ${fmt(tau, 3, 's')}`);
  const crit = tauSCrit(K, tau, Kp.value, Ki.value, Kd.value);
  rCrit.set(crit === null ? 'no limit on this line' : fmt(crit, 3, 's'));

  // With integral action the final value is the setpoint. With P only, it is K Kp / (1 + K Kp).
  const final = Ki.value > 0 ? 1 : (K * Kp.value) / (1 + K * Kp.value);
  status.textContent = res.t.length ? describeRun(res, final) : '';
  rTrue.set(res.diverged ? 'unstable' : fmt(overshoot(res.y, final), 3, '%'));
  rSensor.set(res.diverged ? 'unstable' : fmt(overshoot(res.ym, final), 3, '%'));

  // Sweep tauS to show the move from overshoot to oscillation. Runs are shorter here to stay fast.
  const maxS = tauS.value > 0.5 ? 5 : 0.5;
  const sweep = linspace(0, maxS, 21);
  const oss = sweep.map(s => {
    const r = simulate({ ...base, tauS: s, T: T / 2 });
    return r.diverged || r.y.length === 0 ? null : overshoot(r.y, final);
  });
  const traces = [line(sweep, oss, 'True overshoot (a gap means unstable)', { connectgaps: false })];
  if (crit !== null && !Number.isNaN(crit) && crit <= maxS) traces.push(vline(crit, 0, Math.max(...oss.filter(v => v !== null), 100), 'Stability limit'));
  draw('sweep', traces, { xaxis: { title: 'Sensor τs (s)' }, yaxis: { title: 'Overshoot (%)', range: [0, 400] } });
}

addPredict(document.getElementById('predict'), [
  { q: 'K<sub>p</sub> = 9, K<sub>i</sub> = 50. Slide &tau;<sub>s</sub> from 0 up to 0.3 s. What happens?', options: ['Nothing changes', 'Overshoot grows until the loop oscillates', 'The loop gets faster and calmer'], answer: 1, why: 'The limit here is &tau;<sub>s</sub> = 0.25 s, with a period of about 1 s.' },
  { q: 'P only, K<sub>p</sub> = 9, &tau;<sub>s</sub> = 1 s. Which is bigger, the true overshoot or what the sensor says?', options: ['The sensor says more', 'They are equal', 'The true overshoot is far bigger'], answer: 2, why: '178% against 35%. The controller only controls what the sensor says.' },
], [tauS, Kp, Ki, Kd, lockable(presets)]);

render();

//checks for P2
// Same settings as the presets: K = tau = 1, Kd = 0, u limit off, T = 30 s like render().
function p2Run(Kp, Ki, tauSValue) {
  return simulate({ ...defaultRun(), plant: { type: 'first', K: 1, tau: 1 }, Kp, Ki, Kd: 0, tauS: tauSValue, T: 30 });
}

function p2Checks() {
  const piRun = p2Run(9, 50, 0.1); // PI preset, final value 1
  const pRun = p2Run(9, 0, 1);     // P only preset, final value 0.9
  return [
    { label: 'PI, K<sub>p</sub> = 9, K<sub>i</sub> = 50: stability limit &tau;<sub>s</sub>', expected: 0.25, tol: 0.001, unit: 's', value: tauSCrit(1, 1, 9, 50, 0) },
    { label: 'P only, K<sub>p</sub> = 9: no stability limit', expected: null, value: tauSCrit(1, 1, 9, 0, 0) },
    { label: 'PI, K<sub>p</sub> = K<sub>i</sub> = 1: no stability limit', expected: null, value: tauSCrit(1, 1, 1, 1, 0) },
    { label: 'PI 9, 50, &tau;<sub>s</sub> = 0.1 s: true overshoot', expected: 79.4, tol: 0.5, unit: '%', value: overshoot(piRun.y, 1) },
    { label: 'PI 9, 50, &tau;<sub>s</sub> = 0.1 s: what the sensor says', expected: 57.7, tol: 0.5, unit: '%', value: overshoot(piRun.ym, 1) },
    { label: 'P only, &tau;<sub>s</sub> = 1 s: true overshoot', expected: 177.9, tol: 0.5, unit: '%', value: overshoot(pRun.y, 0.9) },
    { label: 'P only, &tau;<sub>s</sub> = 1 s: what the sensor says', expected: 35.2, tol: 0.5, unit: '%', value: overshoot(pRun.ym, 0.9) },
  ];
}

function renderP2Checks() {
  const box = document.getElementById('checks');
  if (!box) return;
  const rows = p2Checks().map((c, i) => {
    const unit = c.unit || '';
    let shown, pass;
    if (c.expected === null) {
      pass = c.value === null;
      shown = c.value === null ? 'none' : fmt(c.value, 3, unit);
    } else {
      pass = Number.isFinite(c.value) && Math.abs(c.value - c.expected) <= c.tol;
      shown = Number.isFinite(c.value) ? fmt(c.value, 4, unit) : '&mdash;';
    }
    const expected = c.expected === null ? 'none' : `${c.expected} ${unit}`;
    const tol = c.expected === null ? '' : `&plusmn;${c.tol} ${unit}`;
    const result = pass
      ? '<span class="badge pass">Pass</span>'
      : '<span class="badge fail">Fail</span>';
    return `<tr><td>${i + 1}</td><td>${c.label}</td><td>${expected}</td><td>${shown}</td><td>${tol}</td><td>${result}</td></tr>`;
  }).join('');
  box.innerHTML = `<div class="table-wrap"><table class="checks"><thead><tr><th>#</th><th>Test</th><th>Expected</th><th>Our value</th><th>Tolerance</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
try {
  renderP2Checks();
} catch (err) {
  console.error('P2 checks failed:', err);
}
