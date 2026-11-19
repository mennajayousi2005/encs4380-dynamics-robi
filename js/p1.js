// P1, the PID playground. OWNER: Menna.
// The page wiring below already works. It needs simulate(), piLoop() and kdMax() from engine.js, marked TODO(Menna).
import { renderNav, addSlider, addReadout, addSelect, addButtons, lockable, fmt, addTodoBanner } from './ui.js';
import { draw, line } from './plot.js';
import { addPredict } from './predict.js';
import { renderChecks } from './validate.js';
import { readMetrics } from './metrics.js';
import { defaultRun, simulate, thin, kdMax } from './engine.js';
import { controlChecks } from './control_checks.js';
import { MY_SYSTEM } from './my_system.js';

renderNav();
const banner = addTodoBanner(document.querySelector('main'), 'TODO(Menna): fill in simulate() in js/engine.js. Rand\'s rk4.js and metrics.js from Homework 1 are needed too.');
const controls = document.getElementById('controls');

const plantSel = addSelect(controls, 'Plant', [
  { value: 'msd', label: 'Second order: Module 3 mass-spring-damper' },
  { value: 'first', label: 'First order: Module 1 sensor' },
], onPlant);

const K = addSlider(controls, { label: 'K', min: 0.001, max: 100, value: 1, log: true, onInput: onPlant });
const tau = addSlider(controls, { label: '&tau;', min: 0.01, max: 10, value: 1, log: true, unit: 's', onInput: onPlant });
const m = addSlider(controls, { label: 'm', min: 0.1, max: 5, value: 1, step: 0.1, onInput: render });
const b = addSlider(controls, { label: 'b', min: 0, max: 20, value: 2, step: 0.1, onInput: render });
const k = addSlider(controls, { label: 'k', min: 0.5, max: 50, value: 4, step: 0.5, onInput: render });
const Kp = addSlider(controls, { label: 'K<sub>p</sub>', min: 0, max: 100, value: 36, step: 0.5, onInput: render });
const Ki = addSlider(controls, { label: 'K<sub>i</sub>', min: 0, max: 200, value: 30, step: 0.5, onInput: render });
const Kd = addSlider(controls, { label: 'K<sub>d</sub>', min: 0, max: 20, value: 0, step: 0.05, onInput: render });
const r = addSlider(controls, { label: 'Setpoint step', min: 0.1, max: 5, value: 1, step: 0.1, onInput: render });
const uMax = addSlider(controls, { label: 'u limit (&plusmn;), 0 means no limit', min: 0, max: 100, value: 0, step: 1, onInput: render });

const out = document.getElementById('readouts');
const rRise = addReadout(out, 'Rise time (to 90%)');
const rOS = addReadout(out, 'Overshoot');
const rSettle = addReadout(out, 'Settling time (2%)');
const rErr = addReadout(out, 'Steady-state error');
const note = document.getElementById('status');

function setGains(p, i, d) {
  Kp.setRange(0, 100, 0.5);
  Ki.setRange(0, 200, 0.5);
  Kp.set(p);
  Ki.set(i);
  Kd.set(d);
  render();
}

const presets = addButtons(document.getElementById('presets'), [
  { label: 'Kp lesson: Kp = 36', onClick: () => { plantSel.set('msd'); onPlant(); setGains(36, 0, 0); } },
  { label: 'Ki lesson: add Ki = 30', onClick: () => { plantSel.set('msd'); onPlant(); setGains(36, 30, 0); } },
  { label: 'Kd lesson: add Kd = 5', onClick: () => { plantSel.set('msd'); onPlant(); setGains(36, 30, 5); } },
  { label: 'First order: P only, Kp = 9', onClick: () => { plantSel.set('first'); K.set(1); tau.set(1); onPlant(); setGains(9, 0, 0); } },
  { label: 'First order: PI 9, 50', onClick: () => { plantSel.set('first'); K.set(1); tau.set(1); onPlant(); setGains(9, 50, 0); } },
  { label: 'Use our motor', onClick: useMotor },
]);

// The preset gains are for K = tau = 1 and go unstable on a fast motor, so the button also loads our designed gains.
function useMotorGains() {
  Kp.setRange(0, 3 * MY_SYSTEM.Kp, MY_SYSTEM.Kp / 50);
  Kp.set(MY_SYSTEM.Kp);
  Ki.setRange(0, 3 * MY_SYSTEM.Ki, MY_SYSTEM.Ki / 50);
  Ki.set(MY_SYSTEM.Ki);
  Kd.set(0);
}

// Puts our Micromouse motor and its gains from js/my_system.js into the first-order plant.
function useMotor() {
  if (![MY_SYSTEM.K, MY_SYSTEM.tau, MY_SYSTEM.Kp, MY_SYSTEM.Ki].every(Number.isFinite)) {
    note.textContent = 'Fill in K, tau, Kp and Ki in js/my_system.js first.';
    return;
  }
  plantSel.set('first');
  K.set(MY_SYSTEM.K);
  tau.set(MY_SYSTEM.tau);
  onPlant();
  useMotorGains();
  render();
}

// Only the sliders for the chosen plant are active. On the first-order plant Kd stops below tau/K.
function onPlant() {
  const first = plantSel.value === 'first';
  K.disable(!first); tau.disable(!first);
  m.disable(first); b.disable(first); k.disable(first);
  const limit = first ? kdMax(K.value, tau.value) : 20;
  if (Number.isFinite(limit)) Kd.setRange(0, limit, limit / 20);
  render();
}

// Check 3 tests the current PI gains. It needs Ki > 0, so it falls back to Kp = Ki = 1 under P or PD control.
function renderValidation() {
  const box = document.getElementById('checks');
  box.innerHTML = '';
  renderChecks(box, controlChecks(Ki.value > 0 ? { Kp: Kp.value, Ki: Ki.value } : { Kp: 1, Ki: 1 }));
}

// The table waits until the slider stops moving, since it runs several simulations of its own.
let validationTimer;

function render() {
  clearTimeout(validationTimer);
  validationTimer = setTimeout(renderValidation, 300);
  const first = plantSel.value === 'first';
  const plant = first ? { type: 'first', K: K.value, tau: tau.value } : { type: 'msd', m: m.value, b: b.value, k: k.value };
  const limit = uMax.value > 0 ? uMax.value : Infinity;
  const res = simulate({ ...defaultRun(), plant, Kp: Kp.value, Ki: Ki.value, Kd: Kd.value, r: r.value, uMin: -limit, uMax: limit, T: first ? 10 * tau.value : 20 });
  banner.show(res.t.length === 0);

  const t = thin(res.t);
  draw('output', [
    line(t, thin(res.y), 'Output y'),
    line(t, t.map(() => r.value), 'Setpoint', { line: { dash: 'dot', color: '#7f8c8d' } }),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output' } });
  const uTraces = [line(t, thin(res.u), 'Control signal u', { line: { color: '#b9770e' } })];
  if (limit !== Infinity) {
    uTraces.push(line(t, t.map(() => limit), 'Limit', { line: { dash: 'dash', color: '#c0392b' } }));
    uTraces.push(line(t, t.map(() => -limit), '', { line: { dash: 'dash', color: '#c0392b' }, showlegend: false }));
  }
  draw('control', uTraces, { xaxis: { title: 'Time (s)' }, yaxis: { title: 'u' } });

  if (res.diverged) {
    note.textContent = 'Unstable: the output is growing without limit.';
    [rRise, rOS, rSettle, rErr].forEach(x => x.set('-'));
    return;
  }
  note.textContent = '';
  const final = res.y.length ? res.y[res.y.length - 1] : NaN;
  const met = readMetrics(res.t, res.y, final);
  rRise.set(met.rise === null ? 'none' : fmt(met.rise, 3, 's'));
  rOS.set(met.overshoot === 0 ? 'none' : fmt(met.overshoot, 3, '%'));
  rSettle.set(met.settling === null ? 'does not settle in this window' : fmt(met.settling, 3, 's'));
  rErr.set(fmt((Math.abs(r.value - final) / r.value) * 100, 3, '%'));
}

addPredict(document.getElementById('predict'), [
  { q: 'Module 3 plant, P only. Raise K<sub>p</sub> from 4 to 36. What happens to the overshoot and the error?', options: ['Both fall', 'Overshoot rises, error falls', 'Both rise'], answer: 1, why: 'Overshoot goes from 30.5% to 60.7%, and the error from 50% to 10%, which is k/(k + K<sub>p</sub>).' },
  { q: 'Module 3 plant, K<sub>p</sub> = 36, K<sub>i</sub> = 30. Raise K<sub>d</sub> from 0 to 5. What happens to the overshoot?', options: ['It falls', 'It stays the same', 'It rises'], answer: 0, why: 'It falls from 62.5% to 17.9%. Too much D slows the loop again: settling gets worse by K<sub>d</sub> = 10.' },
], [Kp, Ki, Kd, lockable(presets)]);

onPlant();
