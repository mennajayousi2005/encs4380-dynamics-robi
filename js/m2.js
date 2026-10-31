// Module 2 page. OWNER: Nada.
// The page wiring below already works. The maths it needs is in models.js, marked TODO(Nada).
import { renderNav, addSlider, addReadout, addNumber, fmt, addTodoBanner } from './ui.js';
import { draw, line, dots, vline, linspace, logspace } from './plot.js';
import { addPredict } from './predict.js';
import { renderChecks } from './validate.js';
import { CHECKS } from './checks.js';
import { ampRatio, phaseDeg, dynamicError, tauMax, sineSteady } from './models.js';

renderNav();
const banner = addTodoBanner(document.querySelector('main'), 'TODO(Nada): fill in the Module 2 functions in js/models.js. This page then comes alive.');
const controls = document.getElementById('controls');
const tau = addSlider(controls, { label: '&tau;', min: 1e-4, max: 1, value: 0.2, log: true, unit: 's', onInput: render });
const freq = addSlider(controls, { label: 'Frequency f', min: 0.01, max: 1000, value: 1 / Math.PI, log: true, unit: 'Hz', onInput: render });

const out = document.getElementById('readouts');
const rOmega = addReadout(out, '&omega; = 2&pi;f');
const rM = addReadout(out, 'Amplitude ratio M');
const rPhi = addReadout(out, 'Phase &phi;');
const rDelta = addReadout(out, 'Dynamic error &delta; = M &minus; 1');
const rCut = addReadout(out, 'Cutoff &omega; = 1/&tau;');

const calc = document.getElementById('calculator');
const fMaxBox = addNumber(calc, 'Highest signal frequency (Hz)', { value: 100, onInput: renderCalc });
const errBox = addNumber(calc, 'Allowed dynamic error (%)', { value: 5, onInput: renderCalc });
const rTauMax = addReadout(calc, '&tau;<sub>max</sub>');

function renderCalc() {
  rTauMax.set(fmt(tauMax(fMaxBox.value, errBox.value / 100) * 1000, 3, 'ms'));
}

function render() {
  const T = tau.value;
  const f = freq.value;
  const w = 2 * Math.PI * f;
  banner.show(Number.isNaN(ampRatio(1, 1)));

  // About 3 periods with 60 samples per period, so a fast sine never looks jagged.
  const t = linspace(0, 3 / f, 181);
  draw('sines', [
    line(t, t.map(v => Math.sin(w * v)), 'Input'),
    line(t, t.map(v => sineSteady(v, 1, w, T)), 'Output (settled)'),
  ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Signal', range: [-1.1, 1.1] } });

  const wc = 1 / T;
  const ws = logspace(wc / 1000, wc * 1000, 200);
  const dB = ws.map(v => 20 * Math.log10(ampRatio(v, T)));
  draw('bodeMag', [
    line(ws, dB, 'Magnitude'),
    vline(wc, -65, 5, 'Cutoff ω = 1/τ'),
    dots([w], [20 * Math.log10(ampRatio(w, T))], 'Current frequency'),
  ], { xaxis: { type: 'log', title: 'ω (rad/s)' }, yaxis: { title: 'Magnitude (dB)', range: [-65, 5] } });
  draw('bodePhase', [
    line(ws, ws.map(v => phaseDeg(v, T)), 'Phase'),
    vline(wc, -95, 5, 'Cutoff ω = 1/τ'),
    dots([w], [phaseDeg(w, T)], 'Current frequency'),
  ], { xaxis: { type: 'log', title: 'ω (rad/s)' }, yaxis: { title: 'Phase (deg)', range: [-95, 5] } });

  const M = ampRatio(w, T);
  rOmega.set(fmt(w, 4, 'rad/s'));
  rM.set(fmt(M, 4));
  rPhi.set(fmt(phaseDeg(w, T), 4, '°'));
  rDelta.set(fmt(dynamicError(M) * 100, 3, '%'));
  rCut.set(fmt(wc, 4, 'rad/s'));
  renderCalc();
}

addPredict(document.getElementById('predict'), [
  { q: 'At &omega; = 1/&tau;, what is the amplitude ratio?', options: ['1.0', '0.707', '0.5'], answer: 1, why: 'M = 1/&radic;2 = 0.707, which is the cutoff.' },
  { q: 'Raise the frequency far above the cutoff. What does the phase lag approach?', options: ['45&deg;', '90&deg;', '180&deg;'], answer: 1, why: 'tan<sup>&minus;1</sup>(&omega;&tau;) approaches 90&deg; for a first-order sensor.' },
], [tau, freq]);

renderChecks(document.getElementById('checks'), CHECKS.filter(c => c.check === 2 || c.check === 3));
render();
