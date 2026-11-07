// The hidden sensors for Module 4. OWNER: Nada. Homework 2's P4 reuses this file.
import { firstOrderStep, sineSteady, secondOrderStep } from './models.js';
import { linspace } from './plot.js';


// Already working: a random number between lo and hi.
export function randomBetween(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

function isPositive(x) {
  if (Number.isFinite(x) && x > 0) {
    return true;
  }

  return false;
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
    zeta: randomBetween(0.2, 0.7),  //damping ratio: overshoot from 52.7% down to 4.6%
    wn: randomBetween(1, 10),       //natural frequency
  };
}

//The clean output of a sensor at time t.
//input is { type: 'step' } or { type: 'sine', w }. Amplitude 1.
export function sensorOutput(sensor, input, t) {

  if (!sensor || !input || !Number.isFinite(t)) {
    return NaN;
  }
  // Check sensor values
  if (sensor.order === 1) {
    if (!isPositive(sensor.K) || !isPositive(sensor.tau)) {
      return NaN;
    }

  } else if (sensor.order === 2) {
    if (!isPositive(sensor.zeta) || !isPositive(sensor.wn)) {
      return NaN;
    }
  } else {
    return NaN;
  }

  // Check input type
  if (input.type !== 'step' && input.type !== 'sine') {
    return NaN;
  }

  // Second order only uses step input
  if (sensor.order === 2 && input.type !== 'step') {
    return NaN;
  }

  // Check sine frequency
  if (input.type === 'sine' && !isPositive(input.w)) {
    return NaN;
  }
  // Return 0 before the input starts
  if (t < 0) {
    return 0;
  }
  if (sensor.order === 2) {
    return secondOrderStep(t, sensor.zeta, sensor.wn);
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
  return NaN;
}


// Prepares one round for the sensor
export function makeRound(sensor) {

  // Check if the sensor values are valid
  const isFirst = sensor && sensor.order === 1 && isPositive(sensor.K) && isPositive(sensor.tau);
  const isSecond = sensor && sensor.order === 2 && isPositive(sensor.zeta) && isPositive(sensor.wn);

  if (!isFirst && !isSecond) {
    return { input: { type: 'step' }, t: [], u: null, y: [] };
  }

  let input, T, noiseSD;
  if (isFirst && Math.random() < 1 / 3) {

    // First order sensor with sine input
    const w = randomBetween(0.5, 2) / sensor.tau;
    input = { type: 'sine', w };
    T = 3 * (2 * Math.PI / w);
    noiseSD = 0.01;

  } else if (isFirst) {

    // First order sensor with step input
    input = { type: 'step' };
    T = randomBetween(4, 7) * sensor.tau;
    noiseSD = 0.01 * sensor.K;

  } else {
    input = { type: 'step' };
    T = randomBetween(4, 7) * 4 / (sensor.zeta * sensor.wn);
    noiseSD = 0.01;
  }

  T = Number(T.toPrecision(2));
  // Check if T is valid 
  if (!Number.isFinite(T) || T <= 0) {
    return { input, t: [], u: null, y: [] };
  }

  const t = linspace(0, T, 301);
  let u = null;

  if (input.type === 'sine') {
    u = [];

    for (let i = 0; i < t.length; i++) {
      u.push(Math.sin(input.w * t[i]));
    }
  }
  // Calculate sensor output and add noise
  const y = [];

  for (let i = 0; i < t.length; i++) {
    const output = sensorOutput(sensor, input, t[i]);
    const noise = gaussian(noiseSD);
    y.push(output + noise);
  }

  return { input, t, u, y };
}


// Score for one parameter: 100 for an error up to 10%, falling in a straight line to 0 at 50% error.
export function scoreParam(guess, truth) {

  // Check if the guess is empty
  if (guess === null || guess === undefined || String(guess).trim() === '') {
    return 0;
  }

  // Check the input type
  if (typeof guess !== 'number' && typeof guess !== 'string') {
    return 0;
  }

  const value = Number(guess);
  if (!Number.isFinite(value)) {
    return 0;
  }

  // Check if the true value is valid
  if (!Number.isFinite(truth) || truth === 0) {
    return NaN;
  }

  // Calculate relative error
  const error = Math.abs(value / truth - 1);
  //we use it to avoid floating point rounding errors
  const EPS = 1e-9;
  // Check if the error is valid
  if (!Number.isFinite(error)) {
    return 0;
  }

  // Full score for error up to 10%
  if (error <= 0.1 + EPS) {
    return 100;
  }

  // Zero score for error of 50% or more
  if (error >= 0.5 - EPS) {
    return 0;
  }
}


// Score for the round: the average over the parameters. guess is { K, tau } or { zeta, wn }.
export function scoreRound(sensor, guess) {
  // Check if the sensor exists
  if (!sensor) {
    return NaN;
  }
  // Use empty values if there is no guess
  const g = guess || {};

  // Calculate the score for first order sensor
  if (sensor.order === 1) {
    const scoreK = scoreParam(g.K, sensor.K);
    const scoreTau = scoreParam(g.tau, sensor.tau);
    return (scoreK + scoreTau) / 2;
  }

  // Calculate the score for second order sensor
  if (sensor.order === 2) {
    const scoreZeta = scoreParam(g.zeta, sensor.zeta);
    const scoreWn = scoreParam(g.wn, sensor.wn);

    return (scoreZeta + scoreWn) / 2;
  }
  //when the sensor order is invalid
  return NaN;
}
