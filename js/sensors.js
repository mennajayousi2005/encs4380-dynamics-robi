// The hidden sensors for Module 4. OWNER: Nada. Homework 2's P4 reuses this file.
import { firstOrderStep, sineSteady, secondOrderStep } from './models.js';
import { linspace } from './plot.js';

// Already working: a random number between lo and hi.
export function randomBetween(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

// Already working: one sample of Gaussian noise with the given standard deviation (Box-Muller).
export function gaussian(std) {
  const u = 1 - Math.random();
  const v = Math.random();
  return std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Picks a hidden sensor. Half the time first order: { order: 1, K, tau }, K from 0.5 to 5, tau from 0.5 to 10 s.
// Otherwise second order: { order: 2, zeta, wn }, zeta from 0.2 to 0.7, wn from 1 to 10 rad/s.
// zeta stays below 0.7 because overshoot and peak time must be readable: at 0.8 the overshoot is 1.5%, lost in the noise.
export function randomSensor() {
  // TODO(Nada): use Math.random() < 0.5 to choose the order, and randomBetween for the values.
  return { order: 1, K: NaN, tau: NaN };
}

// The clean output of a sensor at time t. input is { type: 'step' } or { type: 'sine', w }. Amplitude 1.
export function sensorOutput(sensor, input, t) {
  // TODO(Nada):
  // 1. Second order: return secondOrderStep(t, sensor.zeta, sensor.wn).
  // 2. First order with a step: return firstOrderStep(t, sensor.K, 1, sensor.tau).
  // 3. First order with a sine: return sensor.K * sineSteady(t, 1, input.w, sensor.tau).
  return NaN;
}

// Prepares one round: the input, the time axis, and the noisy curve the user will read.
// Returns { input, t, u, y }. u is the input signal for sine rounds, and null for steps.
export function makeRound(sensor) {
  // TODO(Nada):
  // 1. First-order sensors get a sine about one round in three. Choose w = randomBetween(0.5, 2) / tau, so
  //    that w tau is between 0.5 and 2: otherwise the lag is too small to read or the output too small to see.
  // 2. Choose the window T with a random factor, or reading the axis gives the answer away:
  //    first-order step: randomBetween(4, 7) * tau;  second order: randomBetween(4, 7) * 4 / (zeta wn);
  //    sine: 3 periods, 2 pi / w each. Round T to 2 significant figures: Number(T.toPrecision(2)).
  // 3. t = linspace(0, T, 301). Compute each clean y with sensorOutput.
  // 4. Add gaussian noise ONCE, here, so that redraws do not change the curve. The standard deviation
  //    is 1% of the final value (K for first order, 1 for second order), or 1% of the input amplitude on sine rounds.
  return { input: { type: 'step' }, t: [], u: null, y: [] };
}

// Score for one parameter: 100 for an error up to 10%, falling in a straight line to 0 at 50% error.
export function scoreParam(guess, truth) {
  // TODO(Nada):
  // 1. error = |guess - truth| / |truth|. A guess that is not a number scores 0.
  // 2. Apply the rule above. The statement fixes only "within 10% is full marks", so the page states this rule.
  return NaN;
}

// Score for the round: the average over the parameters. guess is { K, tau } or { zeta, wn }.
export function scoreRound(sensor, guess) {
  // TODO(Nada): average scoreParam over K and tau (first order), or zeta and wn (second order).
  return NaN;
}
