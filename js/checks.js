// The six validation checks from the statement. OWNER: Menna keeps the file.
// Every value comes from the same functions that draw the plots, with fixed parameters.
// The tolerances are ours; they match how the statement rounds its numbers.
import { firstOrderStep, ampRatio, phaseDeg, tauMax, secondOrderStep, stateMatrices, eigenvalues2x2, poles, msdParams } from './models.js';
import { readMetrics } from './metrics.js';
import { linspace } from './plot.js';

// Overshoot read off the sampled curve, against the known final value of 1.
function overshootAt(zeta, wn) {
  const t = linspace(0, 8 / (zeta * wn), 2001);
  const y = t.map(v => secondOrderStep(v, zeta, wn));
  return readMetrics(t, y, 1).overshoot;
}

function maxPoleEigenGap() {
  const { zeta, wn } = msdParams(1, 2, 4);
  const p = poles(zeta, wn);
  const e = eigenvalues2x2(stateMatrices(1, 2, 4).A);
  return Math.max(Math.abs(p[0].re - e[0].re), Math.abs(Math.abs(p[0].im) - Math.abs(e[0].im)));
}

export const CHECKS = [
  { check: 1, owner: 'Menna', label: 'First-order step: y(&tau;) / KA, with &tau; = 1 s', expected: 0.632, tol: 0.001, value: () => firstOrderStep(1, 1, 1, 1) },
  { check: 1, owner: 'Menna', label: 'First-order step: y(3&tau;) / KA, with &tau; = 1 s', expected: 0.95, tol: 0.001, value: () => firstOrderStep(3, 1, 1, 1) },
  { check: 2, owner: 'Nada', label: '&tau; = 0.2 s, input sin 2t: amplitude ratio', expected: 0.93, tol: 0.005, value: () => ampRatio(2, 0.2) },
  { check: 2, owner: 'Nada', label: '&tau; = 0.2 s, input sin 2t: phase lag', expected: 21.8, tol: 0.05, unit: '&deg;', value: () => Math.abs(phaseDeg(2, 0.2)) },
  { check: 3, owner: 'Nada', label: '100 Hz with at most 5% error: &tau;<sub>max</sub>', expected: 0.52, tol: 0.005, unit: 'ms', value: () => tauMax(100, 0.05) * 1000 },
  { check: 3, owner: 'Nada', label: 'Phase lag at 50 Hz with that &tau;<sub>max</sub>', expected: 9.3, tol: 0.05, unit: '&deg;', value: () => Math.abs(phaseDeg(2 * Math.PI * 50, tauMax(100, 0.05))) },
  { check: 4, owner: 'Rand', label: '&zeta; = 0.5: overshoot read off the curve', expected: 16.3, tol: 0.1, unit: '%', value: () => overshootAt(0.5, 2) },
  { check: 5, owner: 'Rand', label: '&zeta; = 1: overshoot read off the curve', expected: 0, tol: 0.01, unit: '%', value: () => overshootAt(1, 2) },
  { check: 6, owner: 'Rand', label: 'm=1, b=2, k=4: real part of the eigenvalues of A', expected: -1, tol: 0.001, value: () => eigenvalues2x2(stateMatrices(1, 2, 4).A)[0].re },
  { check: 6, owner: 'Rand', label: 'm=1, b=2, k=4: imaginary part of the eigenvalues of A', expected: 1.732, tol: 0.001, value: () => Math.abs(eigenvalues2x2(stateMatrices(1, 2, 4).A)[0].im) },
  { check: 6, owner: 'Rand', label: 'Largest gap between the eigenvalues and the poles', expected: 0, tol: 0.001, value: maxPoleEigenGap },
];
