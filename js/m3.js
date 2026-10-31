// Module 3 page and state-space panel. OWNER: Rand.
// The page wiring below already works. The maths it needs is in models.js, metrics.js and rk4.js,
// marked TODO(Rand).
import { renderNav, addSlider, addReadout, addButtons, lockable, fmt, tex, addTodoBanner } from './ui.js';
import { draw, line, dots, linspace } from './plot.js';
import { addPredict } from './predict.js';
import { renderChecks } from './validate.js';
import { CHECKS } from './checks.js';
import { msdParams, secondOrderStep, timeWindow, poles, stateMatrices, eigenvalues2x2 } from './models.js';
import { readMetrics } from './metrics.js';
import { simulateMSD } from './rk4.js';

renderNav();
const F = 4; // step force in newtons, as in the notes: with k = 4 the step settles at 1
const banner = addTodoBanner(document.querySelector('main'), 'TODO(Rand): fill in the Module 3 functions in js/models.js, js/metrics.js and js/rk4.js. This page then comes alive.');
const controls = document.getElementById('controls');
const m = addSlider(controls, { label: 'Mass m', min: 0.1, max: 5, value: 1, step: 0.1, unit: 'kg', onInput: () => fromMBK() });
const b = addSlider(controls, { label: 'Damper b', min: 0, max: 20, value: 2, step: 0.1, unit: 'N s/m', onInput: () => fromMBK() });
const k = addSlider(controls, { label: 'Spring k', min: 0.5, max: 50, value: 4, step: 0.5, unit: 'N/m', onInput: () => fromMBK() });
const zetaS = addSlider(controls, { label: '&zeta; (linked)', min: 0, max: 3, value: 0.5, step: 0.01, onInput: () => fromZetaWn() });
const wnS = addSlider(controls, { label: '&omega;<sub>n</sub> (linked)', min: 0.2, max: 20, value: 2, step: 0.1, unit: 'rad/s', onInput: () => fromZetaWn() });

// Moving m, b or k updates the zeta and wn sliders. set() fires no callback, so the two never chase each other.
function fromMBK() {
  const p = msdParams(m.value, b.value, k.value);
  if (!Number.isNaN(p.zeta)) { zetaS.set(p.zeta); wnS.set(p.wn); }
  render();
}

// Moving zeta or wn changes b and k at the current m, within their slider ranges.
// If a range stops it, zeta and wn are set back to what the system really has.
function fromZetaWn() {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const newK = clamp(m.value * wnS.value ** 2, 0.5, 50);
  const newB = clamp(2 * zetaS.value * Math.sqrt(newK * m.value), 0, 20);
  k.set(newK);
  b.set(newB);
  fromMBK();
}

function presetZeta(zeta) {
  zetaS.set(zeta);
  fromZetaWn();
}

const presets = addButtons(controls, [
  { label: 'Underdamped', onClick: () => presetZeta(0.5) },
  { label: 'Critical', onClick: () => presetZeta(1) },
  { label: 'Overdamped', onClick: () => presetZeta(2) },
]);

const out = document.getElementById('readouts');
const rK = addReadout(out, 'K = 1/k');
const rRise = addReadout(out, 'Rise time (to 90%)');
const rPeak = addReadout(out, 'Peak time');
const rOS = addReadout(out, 'Overshoot');
const rSettle = addReadout(out, 'Settling time (2% band)');
const rSettle5 = addReadout(out, 'Settling time (5% band)');
const rSettleF = addReadout(out, 'Settling, from 4/(&zeta;&omega;<sub>n</sub>)');
const rRiseF = addReadout(out, 'First reaches 100%, slide 68 formula');
const rOSf = addReadout(out, 'Overshoot, from the formula');
const rPeakF = addReadout(out, 'Peak time, from the formula');
const rPoles = addReadout(document.getElementById('panelReadouts'), 'Poles of G(s)');
const rEig = addReadout(document.getElementById('panelReadouts'), 'Eigenvalues of A');

const complexText = z => (z.im === 0 ? fmt(z.re, 4) : `${fmt(z.re, 4)} ± j${fmt(Math.abs(z.im), 4)}`);
const pairText = zs => (zs[0].im !== 0 ? complexText(zs[0]) : `${fmt(zs[0].re, 4)}, ${fmt(zs[1].re, 4)}`);

function render() {
  const { wn, zeta, K } = msdParams(m.value, b.value, k.value);
  banner.show(Number.isNaN(wn) || Number.isNaN(secondOrderStep(1, 0.5, 2)));
  const T = timeWindow(zeta, wn);
  const t = Number.isFinite(T) ? linspace(0, T, 1001) : [];
  const y = t.map(v => K * F * secondOrderStep(v, zeta, wn));
  const final = K * F;
  const met = readMetrics(t, y, final);

  draw('response', [
    line(t, y, 'Closed form x(t)'),
    line(t, t.map(() => final), 'Final value F/k', { line: { dash: 'dot', color: '#7f8c8d' } }),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Displacement x (m)' } });

  rK.set(fmt(K, 3));
  rRise.set(met.rise === null ? 'none' : fmt(met.rise, 3, 's'));
  rPeak.set(met.peakTime === null ? 'none' : fmt(met.peakTime, 3, 's'));
  rOS.set(met.overshoot === 0 ? 'none' : fmt(met.overshoot, 3, '%'));
  rSettle.set(met.settling === null ? 'does not settle in this window' : fmt(met.settling, 3, 's'));
  const met5 = readMetrics(t, y, final, 0.05);
  rSettle5.set(met5.settling === null ? 'does not settle in this window' : fmt(met5.settling, 3, 's'));
  rSettleF.set(zeta > 0 && zeta < 1 ? fmt(4 / (zeta * wn), 3, 's') : 'not for this case');
  // Slide 68 writes arctan(-wd / delta), with the angle taken in the second quadrant: pi - atan(wd / delta).
  const wd = wn * Math.sqrt(1 - zeta * zeta);
  rRiseF.set(zeta > 0 && zeta < 1 ? fmt((Math.PI - Math.atan(wd / (zeta * wn))) / wd, 3, 's') : 'none');
  const under = zeta >= 0 && zeta < 1;
  rOSf.set(under ? fmt(100 * Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)), 3, '%') : 'none');
  rPeakF.set(under ? fmt(Math.PI / (wn * Math.sqrt(1 - zeta * zeta)), 3, 's') : 'none');

  // s-plane: poles from zeta and wn, eigenvalues from the matrix A. They should land on top of each other.
  const p = poles(zeta, wn);
  const { A, B } = stateMatrices(m.value, b.value, k.value);
  const e = eigenvalues2x2(A);
  draw('splane', [
    dots(p.map(z => z.re), p.map(z => z.im), 'Poles', { marker: { symbol: 'x', size: 14, color: '#c0392b' } }),
    dots(e.map(z => z.re), e.map(z => z.im), 'Eigenvalues of A', { marker: { symbol: 'circle-open', size: 16, color: '#1f4e79' } }),
  ], { xaxis: { title: 'Real', zeroline: true }, yaxis: { title: 'Imaginary', zeroline: true } });
  rPoles.set(pairText(p));
  rEig.set(pairText(e));

  const n = v => Number(v.toFixed(3));
  tex(document.getElementById('matrices'),
    `A=\\begin{bmatrix}${n(A[0][0])}&${n(A[0][1])}\\\\${n(A[1][0])}&${n(A[1][1])}\\end{bmatrix},\\quad B=\\begin{bmatrix}${n(B[0])}\\\\${n(B[1])}\\end{bmatrix}`);

  // Phase plane and the bonus overlay both come from our own RK4. The step must suit the fastest pole,
  // or RK4 blows up on a heavily overdamped system. Section 6 of the notes says about 1/20 of the smallest time constant.
  const fastest = Math.max(...e.map(z => Math.hypot(z.re, z.im)));
  const dt = Math.min(T / 1000, 0.05 / fastest);
  const sim = Number.isFinite(dt) ? simulateMSD(m.value, b.value, k.value, F, T, dt) : { t: [], x1: [], x2: [] };
  const everyNth = (arr, count) => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / count)) === 0);
  draw('phase', [line(everyNth(sim.x1, 1000), everyNth(sim.x2, 1000), 'Path of (x1, x2)')], { xaxis: { title: 'x1, displacement (m)' }, yaxis: { title: 'x2, velocity (m/s)' } });
  draw('bonus', [
    line(t, y, 'Closed form'),
    line(everyNth(sim.t, 40), everyNth(sim.x1, 40), 'Our RK4', { mode: 'markers', marker: { size: 6 } }),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'x (m)' } });
}

addPredict(document.getElementById('predict'), [
  { q: 'Double b. What do the poles do, starting from &zeta; = 0.5?', options: ['Move left and stay complex', 'Meet on the real axis (&zeta; = 1)', 'Move right'], answer: 1, why: 'Doubling b doubles &zeta; to exactly 1, so the two poles meet at &minus;&omega;<sub>n</sub>.' },
  { q: 'Change k and m together so that &zeta; stays fixed. What happens to the overshoot?', options: ['It grows', 'It stays the same', 'It shrinks'], answer: 1, why: 'Overshoot depends only on &zeta;.' },
], [m, b, k, zetaS, wnS, lockable(presets)]);

renderChecks(document.getElementById('checks'), CHECKS.filter(c => c.check >= 4));
render();
