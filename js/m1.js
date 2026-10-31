// Module 1 page. OWNER: Menna.
// The page wiring below already works. The maths it needs is in models.js, marked TODO(Menna).
import { renderNav, addSlider, addReadout, addSelect, fmt, addTodoBanner } from './ui.js';
import { draw, line, dots, linspace } from './plot.js';
import { addPredict } from './predict.js';
import { renderChecks } from './validate.js';
import { CHECKS } from './checks.js';
import { firstOrderStep, firstOrderRamp, lnErrorFraction, fitSlope } from './models.js';

renderNav();
const A = 1; // step size
const R = 1; // ramp rate

const controls = document.getElementById('controls');
const banner = addTodoBanner(document.querySelector('main'), 'TODO(Menna): fill in the Module 1 functions in js/models.js. This page then comes alive.');
const inputType = addSelect(controls, 'Input', [{ value: 'step', label: 'Step' }, { value: 'ramp', label: 'Ramp' }], render);
const K = addSlider(controls, { label: 'K', min: 0.1, max: 5, value: 1, step: 0.1, onInput: render });
const tau = addSlider(controls, { label: '&tau;', min: 0.1, max: 20, value: 2, step: 0.1, unit: 's', onInput: render });

const out = document.getElementById('readouts');
const r63 = addReadout(out, 'y(&tau;) / KA');
const r95 = addReadout(out, 'y(3&tau;) / KA');
const rSlope = addReadout(out, 'Fitted slope of ln(e)');
const rTheory = addReadout(out, '&minus;1/&tau;');
const rLag = addReadout(out, 'Ramp lag');
const rErr = addReadout(out, 'Ramp steady-state error');

function render() {
  const k = K.value;
  const T = tau.value;
  const t = linspace(0, 5 * T, 400);
  banner.show(Number.isNaN(firstOrderStep(1, 1, 1, 1)));

  if (inputType.value === 'step') {
    const y = t.map(v => firstOrderStep(v, k, A, T));
    draw('response', [
      line(t, y, 'Output y'),
      line(t, t.map(() => k * A), 'Final value KA', { line: { dash: 'dot', color: '#7f8c8d' } }),
      dots([T, 3 * T], [firstOrderStep(T, k, A, T), firstOrderStep(3 * T, k, A, T)], '63.2% at τ, 95% at 3τ'),
    ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output' } });
    rLag.set('-');
    rErr.set('-');
  } else {
    // As on slide 54: compare y/K with the input x. Then the lag is tau and the error is R tau, for any K.
    const yOverK = t.map(v => firstOrderRamp(v, k, R, T) / k);
    draw('response', [
      line(t, yOverK, 'Output y/K'),
      line(t, t.map(v => R * v), 'Input x', { line: { dash: 'dot', color: '#7f8c8d' } }),
    ], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Signal, y/K' } });
    rLag.set(fmt(T, 3, 's'));
    rErr.set(fmt(R * T, 3));
  }

  // The error-fraction plot always uses the step, up to about 5 tau.
  const yStep = t.map(v => firstOrderStep(v, k, A, T));
  const lnE = yStep.map(v => lnErrorFraction(v, k, A));
  draw('error', [line(t, lnE, 'ln(error fraction)')], {
    xaxis: { title: 'Time (s)' },
    // ln(e) on a linear axis, labelled with e itself, as on slide 52. A base-10 log axis would show -0.434/tau instead.
    yaxis: { title: 'Error fraction e', tickvals: [0, Math.log(0.368), Math.log(0.1), Math.log(0.01), Math.log(0.001)], ticktext: ['1', '0.368', '0.1', '0.01', '0.001'], range: [-7, 0.2] },
  });

  r63.set(fmt(firstOrderStep(T, k, A, T) / (k * A), 4));
  r95.set(fmt(firstOrderStep(3 * T, k, A, T) / (k * A), 4));
  rSlope.set(fmt(fitSlope(t, lnE), 4));
  rTheory.set(fmt(-1 / T, 4));
}

addPredict(document.getElementById('predict'), [
  { q: 'If &tau; doubles, what does the sensor read at the old &tau;?', options: ['Still 63.2% of the way', 'About 39% of the way', 'About 86% of the way'], answer: 1, why: 'At half of the new &tau;, y = 1 &minus; e<sup>&minus;0.5</sup> = 39.3% of KA.' },
  { q: 'If K doubles, what happens to the time to reach 63.2% of the final value?', options: ['It halves', 'It stays the same', 'It doubles'], answer: 1, why: 'K scales the output. Only &tau; sets the timing.' },
], [K, tau]);

renderChecks(document.getElementById('checks'), CHECKS.filter(c => c.check === 1));
render();
