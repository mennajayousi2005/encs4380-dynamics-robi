// P4, the tuning challenge. OWNER: Rand.
// The game flow below already works once Menna's engine and Nada's sensors.js are in.
// Rand's functions are marked TODO(Rand).
import { renderNav, addNumber, addButtons, addReadout, fmt, addTodoBanner } from './ui.js';
import { draw, line, linspace } from './plot.js';
import { readMetrics } from './metrics.js';
import { defaultRun, simulate, thin } from './engine.js';
import { randomSensor, sensorOutput, gaussian } from './sensors.js';

// Converts a hidden sensor from Homework 1's Module 4 into a plant for the engine.
export function sensorToPlant(sensor) {
  // TODO(Rand): first order gives { type: 'first', K, tau }. Second order gives { type: 'second', K: 1, zeta, wn }.
  return null;
}

// Gains known to work on this plant, so that the spec is always possible.
// First order: Kp = 3.2 / K, Ki = 9 / (K tau), Kd = 0. Measures 12.6% overshoot at any K and tau.
// Second order: Kp = 9, Ki = 3.75 wn, Kd = 5 / wn. Measures about 10% for zeta from 0.2 to 0.7.
export function referenceGains(sensor) {
  // TODO(Rand): return { Kp, Ki, Kd } from the rules above.
  return { Kp: NaN, Ki: NaN, Kd: NaN };
}

// Run length: about 10 slowest time constants. First order: 10 tau. Second order: 40 / wn.
export function runLength(sensor) {
  // TODO(Rand): return the length above.
  return NaN;
}

// The spec, built from the hidden reference run's metrics and its peak u.
// Overshoot limit: the larger of 10% and the measured value plus 2 points.
// Settling limit: 1.5 times the measured value. Steady-state error limit: 0.5%. u limit: twice the peak u.
export function makeSpec(met, peakU) {
  // TODO(Rand): return { maxOvershoot, maxSettling, maxError, uLimit } from the rules above.
  return { maxOvershoot: NaN, maxSettling: NaN, maxError: 0.5, uLimit: NaN };
}

// Pass or fail on each part. met comes from readMetrics on the user's curve, never from a formula.
// errorPct is the steady-state error in percent. A settling of null (does not settle) fails.
export function judge(met, errorPct, spec) {
  // TODO(Rand): return { overshoot: bool, settling: bool, error: bool }.
  return { overshoot: false, settling: false, error: false };
}

renderNav();
const banner = addTodoBanner(document.querySelector('main'), 'Waiting for simulate() from Menna and randomSensor() from Nada, and TODO(Rand) in js/p4.js.');
const specBox = document.getElementById('spec');
const gainsBox = document.getElementById('gains');
const resultBox = document.getElementById('result');
const out = document.getElementById('readouts');
const rOS = addReadout(out, 'Your overshoot');
const rSettle = addReadout(out, 'Your settling time');
const rErr = addReadout(out, 'Your steady-state error');
const rScore = addReadout(out, 'Session average');

const Kp = addNumber(gainsBox, 'K<sub>p</sub>', { value: 1 });
const Ki = addNumber(gainsBox, 'K<sub>i</sub>', { value: 1 });
const Kd = addNumber(gainsBox, 'K<sub>d</sub>', { value: 0 });

let sensor;
let plant;
let spec;
let T;
let total = 0;
let played = 0;

// The "Predict, then check" step: the user must predict before each run.
const predictBox = document.getElementById('predictRun');
predictBox.innerHTML = '<p class="q">Predict: will these gains pass every part of the spec?</p>'
  + '<label><input type="radio" name="predictRun" value="pass"> They will pass every part</label>'
  + '<label><input type="radio" name="predictRun" value="fail"> They will fail at least one part</label>';
let runButton;
const chosenPrediction = () => predictBox.querySelector('input:checked')?.value;

function resetPrediction() {
  predictBox.querySelectorAll('input').forEach(r => { r.checked = false; });
  if (runButton) runButton.disabled = true;
}
predictBox.addEventListener('change', () => { runButton.disabled = false; });

function predictionText(allPass) {
  const said = chosenPrediction() === 'pass';
  return said === allPass ? 'Your prediction was right.' : 'Your prediction was wrong.';
}

function newPlant() {
  resetPrediction();
  sensor = randomSensor();
  plant = sensorToPlant(sensor);
  const ref = referenceGains(sensor);
  T = runLength(sensor);
  resultBox.textContent = '';
  const notReady = !plant || !Number.isFinite(T) || Number.isNaN(ref.Kp);
  const res = notReady ? { t: [], y: [], u: [] } : simulate({ ...defaultRun(), plant, ...ref, T });
  banner.show(res.t.length === 0);
  if (res.t.length === 0) return;
  spec = makeSpec(readMetrics(res.t, res.y, 1), res.u.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0));
  specBox.textContent = `Spec: overshoot at most ${fmt(spec.maxOvershoot, 3, '%')}, settling within ${fmt(spec.maxSettling, 3, 's')}, steady-state error below ${spec.maxError}%. Your u is limited to ±${fmt(spec.uLimit, 3)}.`;
  draw('output', [], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output' } });
}

// The noisy open-loop step, for reading the plant with the Homework 1 methods. Otherwise tuning is blind.
function openLoop() {
  if (!plant) return;
  const final = sensor.order === 1 ? sensor.K : 1;
  const t = linspace(0, T, 601);
  const y = t.map(v => sensorOutput(sensor, { type: 'step' }, v) + gaussian(0.01 * final));
  draw('output', [line(t, y, 'Open-loop step of size 1 (noisy)')], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output' } });
}

function runGains() {
  if (!spec) return;
  const res = simulate({ ...defaultRun(), plant, Kp: Kp.value, Ki: Ki.value, Kd: Kd.value, T, uMin: -spec.uLimit, uMax: spec.uLimit });
  const t = thin(res.t);
  draw('output', [
    line(t, thin(res.y), 'Your response'),
    line(t, t.map(() => 1), 'Setpoint', { line: { dash: 'dot', color: '#7f8c8d' } }),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output', range: res.diverged ? [-5, 5] : undefined } });
  if (res.diverged) {
    resultBox.textContent = `Unstable. Fail on every part. ${predictionText(false)}`;
    played += 1;
    rScore.set(fmt(total / played, 3));
    resetPrediction();
    return;
  }
  const met = readMetrics(res.t, res.y, 1);
  const errorPct = Math.abs(1 - res.y[res.y.length - 1]) * 100;
  const parts = judge(met, errorPct, spec);
  const mark = ok => (ok ? 'PASS' : 'FAIL');
  const score = (100 * [parts.overshoot, parts.settling, parts.error].filter(Boolean).length) / 3;
  played += 1;
  total += score;
  resultBox.textContent = `Overshoot: ${mark(parts.overshoot)}. Settling: ${mark(parts.settling)}. Error: ${mark(parts.error)}. Score ${fmt(score, 3)} of 100. ${predictionText(score === 100)}`;
  rOS.set(fmt(met.overshoot, 3, '%'));
  rSettle.set(met.settling === null ? 'does not settle' : fmt(met.settling, 3, 's'));
  rErr.set(fmt(errorPct, 3, '%'));
  rScore.set(fmt(total / played, 3));
  resetPrediction();
}

const actions = addButtons(document.getElementById('actions'), [
  { label: 'Open-loop test', onClick: openLoop },
  { label: 'Run my gains', onClick: runGains },
  { label: 'New plant', onClick: newPlant },
]);
runButton = actions.children[1];
newPlant();
