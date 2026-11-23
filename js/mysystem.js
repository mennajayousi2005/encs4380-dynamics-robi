import { renderNav, addSlider, addReadout, fmt, addTodoBanner } from './ui.js';
import { draw, line } from './plot.js';
import { readMetrics } from './metrics.js';
import { defaultRun, simulate, thin, piLoop } from './engine.js';
import { arduinoCode } from './arduino.js';
import { MY_SYSTEM } from './my_system.js';

// PI gains for a chosen zeta and wn
// Equations: Ki = wn^2 tau / K
//  Kp = (2 zeta wn tau - 1) / K 
// Kp must not be negative, so wn >= 1 / (2 zeta tau)
export function piFromDesign(K, tau, zeta, wn) {
  // Check valid inputs
  if (![K, tau, zeta, wn].every(Number.isFinite) || K <= 0 || tau <= 0 || zeta <= 0 || wn <= 0) {
    return { Kp: NaN, Ki: NaN };
  }
  const Ki = (wn * wn * tau) / K;
  const Kp = (2 * zeta * wn * tau - 1) / K;
  if (!Number.isFinite(Kp) || !Number.isFinite(Ki)) {
    return { Kp: NaN, Ki: NaN };
  }
  // Prevent negative Kp 
  if (Kp < -1e-9) {
    return { Kp: NaN, Ki: NaN };
  }

  return { Kp: Math.max(Kp, 0), Ki };
}


//Overshoot from the standard second-order formula
export function tableOvershoot(zeta) {
  // check zeta is valid
  if (!Number.isFinite(zeta) || zeta < 0) {
    return NaN;
  }
  if (zeta >= 1) {
    return 0; // no overshoot when zeta >= 1
  }
  return 100 * Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}


renderNav();
const main = document.querySelector('main');
const banner = addTodoBanner(main, 'TODO(Nada): fill in js/my_system.js with the numbers from the step test, and the functions in js/mysystem.js.');
const hasPlant = Number.isFinite(MY_SYSTEM.K) && Number.isFinite(MY_SYSTEM.tau);
const K = hasPlant ? MY_SYSTEM.K : 1;
const tau = hasPlant ? MY_SYSTEM.tau : 1;
banner.show(!hasPlant);

const facts = document.getElementById('facts');
const addFact = (label, value) => addReadout(facts, label).set(value || 'not filled in yet');
addFact('Motor', MY_SYSTEM.motor);
addFact('K', hasPlant ? `${MY_SYSTEM.K} ${MY_SYSTEM.kUnits}` : '');
addFact('&tau;', hasPlant ? `${MY_SYSTEM.tau} s` : '');
addFact('Source', MY_SYSTEM.source);
addFact('Test conditions', MY_SYSTEM.conditions);
addFact('Our spec', MY_SYSTEM.spec);
addFact('Why it matters', MY_SYSTEM.why);

const controls = document.getElementById('controls');
const savedWn = Math.sqrt(MY_SYSTEM.Ki * K / tau);
const savedZeta = (1 + K * MY_SYSTEM.Kp) / (2 * Math.sqrt(tau * K * MY_SYSTEM.Ki));
const hasDesign = Number.isFinite(savedWn) && Number.isFinite(savedZeta);
const zeta = addSlider(controls, { label: '&zeta; (aim for 0.6 to 0.8)', min: 0.6, max: 0.8, value: hasDesign ? Number(savedZeta.toFixed(2)) : 0.7, step: 0.01, onInput: render });
// wn stays at or below 0.2 / Ts: faster than that, sampling itself adds overshoot that the design does not expect.
const wnMin = Number((1 / (2 * 0.6 * tau)).toPrecision(2));
const wnMax = Math.max(Number(Math.min(40 / tau, 0.2 / MY_SYSTEM.Ts).toPrecision(2)), wnMin * 1.1);
const wn = addSlider(controls, { label: '&omega;<sub>n</sub>', min: wnMin, max: wnMax, value: hasDesign ? Number(savedWn.toFixed(1)) : Math.min(Number((5 / tau).toPrecision(2)), wnMax), step: 0.1, unit: 'rad/s', onInput: render });
const out = document.getElementById('readouts');
const rKp = addReadout(out, 'K<sub>p</sub>');
const rKi = addReadout(out, 'K<sub>i</sub>');
const rCheck = addReadout(out, '&zeta; from the roots');
const rTable = addReadout(out, 'Overshoot, usual table');
const rOS = addReadout(out, 'Overshoot, measured');
const rSettle = addReadout(out, 'Settling time, measured');
const rPeak = addReadout(out, 'Peak PWM');
const rSteady = addReadout(out, 'Steady PWM needed (must be well under 100%)');
const rTs = addReadout(out, 'Sampling time');
rSteady.set(fmt((MY_SYSTEM.speedStep / K), 3, '%'));
rTs.set(MY_SYSTEM.Ts > tau / 10
  ? `${fmt(MY_SYSTEM.Ts * 1000, 3, 'ms')}: too slow, use at most ${fmt((tau / 10) * 1000, 3, 'ms')}`
  : fmt(MY_SYSTEM.Ts * 1000, 3, 'ms'));

function render() {
  const { Kp, Ki } = piFromDesign(K, tau, zeta.value, wn.value);
  const run = { ...defaultRun(), plant: { type: 'first', K, tau }, Kp, Ki, r: MY_SYSTEM.speedStep, uMin: 0, uMax: 100, T: Math.max(10 * tau, 40 / wn.value), Ts: MY_SYSTEM.Ts };
  const res = Number.isFinite(Kp) ? simulate(run) : { t: [], y: [], u: [], diverged: false };
  const t = thin(res.t);
  draw('output', [
    line(t, thin(res.y), 'Speed'),
    line(t, t.map(() => MY_SYSTEM.speedStep), 'Setpoint', { line: { dash: 'dot', color: '#7f8c8d' } }),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Speed' } });
  draw('control', [line(t, thin(res.u), 'PWM command (%)', { line: { shape: 'hv', color: '#b9770e' } })], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'PWM (%)', range: [0, 105] } });

  rKp.set(fmt(Kp, 3));
  rKi.set(fmt(Ki, 3));
  rCheck.set(fmt(piLoop(K, tau, Kp, Ki).zeta, 3));
  rTable.set(fmt(tableOvershoot(zeta.value), 3, '%'));
  if (res.t.length) {
    const met = readMetrics(res.t, res.y, MY_SYSTEM.speedStep);
    rOS.set(fmt(met.overshoot, 3, '%'));
    rSettle.set(met.settling === null ? 'does not settle' : fmt(met.settling, 3, 's'));
    rPeak.set(fmt(res.u.reduce((peak, v) => Math.max(peak, v), 0), 3, '%'));
  }
  document.getElementById('code').textContent = arduinoCode({ Kp, Ki, Kd: 0, Ts: run.Ts, uMin: 0, uMax: 100, antiWindup: true });
}

render();
