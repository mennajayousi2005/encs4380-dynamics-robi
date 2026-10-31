// Module 4 page: the "Guess the sensor" game. OWNER: Nada.
// The game flow below already works. The maths it needs is in sensors.js, marked TODO(Nada).
// The statement's "Predict, then check" step here is the guess itself: nothing redraws from the
// guess boxes until the user submits.
import { renderNav, addNumber, addButtons, addReadout, fmt, addTodoBanner } from './ui.js';
import { draw, line } from './plot.js';
import { randomSensor, makeRound, sensorOutput, scoreRound } from './sensors.js';

renderNav();
const banner = addTodoBanner(document.querySelector('main'), 'TODO(Nada): fill in js/sensors.js. Second-order rounds also need secondOrderStep from Rand.');
const guessBox = document.getElementById('guess');
const message = document.getElementById('message');
const out = document.getElementById('readouts');
const rLast = addReadout(out, 'Last round');
const rTotal = addReadout(out, 'Session average');
const rRounds = addReadout(out, 'Rounds played');

let sensor;
let round;
let boxes = {};
let submitted = false;
let total = 0;
let played = 0;

const HINTS = {
  1: 'The final value gives K. Then use the 63.2% point, or the slope of ln(error fraction), which is -1/τ.',
  2: 'Overshoot depends only on ζ. Then the peak time gives ωn.',
  sine: 'The lag gives τ: τ = tan(lag) / ω. Then the amplitude ratio gives K.',
};

function plotRound(extra = []) {
  const traces = [line(round.t, round.y, 'Sensor response', { line: { color: '#1f4e79' } })];
  if (round.u) traces.unshift(line(round.t, round.u, 'Input', { line: { color: '#b9770e' } }));
  draw('response', [...traces, ...extra], { xaxis: { title: 'Time (s)' }, yaxis: { title: 'Output' } });
}

function newRound() {
  sensor = randomSensor();
  round = makeRound(sensor);
  banner.show(round.t.length === 0 || round.y.some(Number.isNaN));
  submitted = false;
  message.textContent = '';
  guessBox.innerHTML = '';
  const order = sensor.order === 1 ? 'First-order' : 'Second-order';
  const what = round.input.type === 'sine' ? `sine input at ω = ${fmt(round.input.w, 3)} rad/s` : 'step input';
  document.getElementById('roundInfo').textContent = `${order} sensor, ${what}.`;
  boxes = sensor.order === 1
    ? { K: addNumber(guessBox, 'Your K'), tau: addNumber(guessBox, 'Your τ (s)') }
    : { zeta: addNumber(guessBox, 'Your ζ'), wn: addNumber(guessBox, 'Your ωn (rad/s)') };
  plotRound();
}

function submit() {
  if (submitted) return;
  const guess = Object.fromEntries(Object.entries(boxes).map(([name, box]) => [name, box.value]));
  if (Object.values(guess).some(v => !Number.isFinite(v))) {
    message.textContent = 'Enter a number in every box first.';
    return;
  }
  submitted = true;
  const score = scoreRound(sensor, guess);
  const guessSensor = { order: sensor.order, ...guess };
  plotRound([
    line(round.t, round.t.map(v => sensorOutput(sensor, round.input, v)), 'True curve', { line: { color: '#1e8449', width: 3 } }),
    line(round.t, round.t.map(v => sensorOutput(guessSensor, round.input, v)), 'Your guess', { line: { color: '#c0392b', dash: 'dash' } }),
  ]);
  const truth = sensor.order === 1
    ? `True K = ${fmt(sensor.K, 3)}, τ = ${fmt(sensor.tau, 3)} s.`
    : `True ζ = ${fmt(sensor.zeta, 3)}, ωn = ${fmt(sensor.wn, 3)} rad/s.`;
  message.textContent = `${truth} Your score: ${fmt(score, 3)} of 100.`;
  played += 1;
  total += score;
  rLast.set(fmt(score, 3));
  rTotal.set(fmt(total / played, 3));
  rRounds.set(String(played));
}

addButtons(document.getElementById('actions'), [
  { label: 'Submit my guess', onClick: submit },
  { label: 'Show a hint', onClick: () => { message.textContent = round.input.type === 'sine' ? HINTS.sine : HINTS[sensor.order]; } },
  { label: 'New sensor', onClick: newRound },
]);
newRound();
