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

export function randomSensor() {
  if (Math.random() < 0.5) { //Math.random() is in [0, 1), so "< 0.5" is true exactly half the time
    return {
      order: 1,
      K: randomBetween(0.5, 5),     //the final value of a unit step
      tau: randomBetween(0.5, 10),  //time constant
    };
  }
  return {
    order: 2,
    zeta: randomBetween(0.2, 0.7),  //damping ratio: overshoot from 30% down to 4.6%
    wn: randomBetween(1, 10),       //natural frequency
  };
}

//The clean output of a sensor at time t.
//input is { type: 'step' } or { type: 'sine', w }. Amplitude 1.
export function sensorOutput(sensor, input, t) {

  if (!sensor || !input || !Number.isFinite(t)) {
    return NaN;
  }
  // Before the input starts the sensor reads 0. This also stops the step formulas going negative.
  if (t < 0) {
    return 0;
  }
  if (sensor.order === 2) {
    if (input.type !== 'step')
      return NaN;
    return secondOrderStep(t, sensor.zeta, sensor.wn);
  }

  //anything other than first or second order is unknown
  if (sensor.order !== 1) {
    return NaN;
  }
  //first order
  if (input.type === 'step') {
    return firstOrderStep(t, sensor.K, 1, sensor.tau);
  }

  //first order with a sine of amplitude 1
  //sineSteady assumes K = 1 
  if (input.type === 'sine') {
    return sensor.K * sineSteady(t, 1, input.w, sensor.tau);
  }

  return NaN;   //unknown input type
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
