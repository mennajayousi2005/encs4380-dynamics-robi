// P3, digital PID. OWNER: Rand.
// The page wiring below already works once Menna's engine is in. Rand's functions are marked TODO(Rand).
import {
  renderNav,
  addSlider,
  addReadout,
  addButtons,
  addSelect,
  lockable,
  fmt,
  addTodoBanner,
} from "./ui.js";
import { draw, line } from "./plot.js";
import { addPredict } from "./predict.js";
import { readMetrics } from "./metrics.js";
import { defaultRun, simulate, thin, kdMax } from "./engine.js";
import { MY_SYSTEM } from "./my_system.js";
import { arduinoCode } from "./arduino.js";

// The sampling time where P-only control goes unstable. Equation: Ts = tau ln((K Kp + 1) / (K Kp - 1))
// Why: with a zero-order hold, the sampled plant is y[k+1] = a y[k] + K (1 - a) u[k], with a = e^(-Ts/tau).
// With u = Kp (r - y), the closed-loop pole is a - K Kp (1 - a). It leaves the unit circle when it reaches -1,
// which gives e^(-Ts/tau) = (K Kp - 1) / (K Kp + 1). Taking ln of both sides gives the equation above.
// If K Kp <= 1 the pole never reaches -1, so the loop is stable at any Ts.
// For K = tau = 1, Kp = 9 it gives 1 * ln(10 / 8) = 0.223 s.
export function tsLimitP(K, tau, Kp) {
  const loopGain = K * Kp;
  if (loopGain <= 1) return null;
  return tau * Math.log((loopGain + 1) / (loopGain - 1));
}

// Runs the same loop at each Ts in tsList (s). Returns [{ Ts, overshoot, settling }].
// overshoot and settling are null when the run diverges.
export function sweepTs(baseRun, tsList, final) {
  return tsList.map((Ts) => {
    const res = simulate({ ...baseRun, Ts });
    // An unstable or empty run has no metrics. null leaves a gap in the sweep plot.
    if (res.diverged || res.t.length === 0)
      return { Ts, overshoot: null, settling: null };
    const met = readMetrics(res.t, res.y, final);
    return { Ts, overshoot: met.overshoot, settling: met.settling };
  });
}

renderNav();
const banner = addTodoBanner(
  document.querySelector("main"),
  "Waiting for simulate() from Menna, and TODO(Rand) in js/p3.js and js/arduino.js.",
);
const controls = document.getElementById("controls");
let K = 1;
let tau = 1;
const Ts = addSlider(controls, {
  label: "Sampling time T<sub>s</sub>",
  min: 1,
  max: 300,
  value: 10,
  step: 1,
  unit: "ms",
  onInput: render,
});
const Kp = addSlider(controls, {
  label: "K<sub>p</sub>",
  min: 0,
  max: 30,
  value: 9,
  step: 0.5,
  onInput: render,
});
const Ki = addSlider(controls, {
  label: "K<sub>i</sub>",
  min: 0,
  max: 100,
  value: 50,
  step: 1,
  onInput: render,
});
const Kd = addSlider(controls, {
  label: "K<sub>d</sub>",
  min: 0,
  max: 0.9,
  value: 0,
  step: 0.05,
  onInput: render,
});
const uMaxS = addSlider(controls, {
  label: "u upper limit, 0 means no limit (lower limit is 0)",
  min: 0,
  max: 20,
  value: 0,
  step: 0.5,
  onInput: render,
});
const aw = addSelect(
  controls,
  "Anti-windup",
  [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
  ],
  render,
);

const out = document.getElementById("readouts");
const rPlant = addReadout(out, "Plant");
const rOS = addReadout(out, "Overshoot");
const rSettle = addReadout(out, "Settling time (2%)");
const rLimit = addReadout(out, "P-only stability limit");
const status = document.getElementById("status");
const codeBox = document.getElementById("code");

function setPlant(newK, newTau) {
  K = newK;
  tau = newTau;
  Kp.setRange(0, 30, 0.5);
  Ki.setRange(0, 100, 1);
  const limit = kdMax(K, tau);
  if (Number.isFinite(limit)) Kd.setRange(0, limit, limit / 20);
}

// The preset gains are for K = tau = 1 and go unstable on a fast motor, so the button also loads our designed gains.
function useMotorGains() {
  Kp.setRange(0, 3 * MY_SYSTEM.Kp, MY_SYSTEM.Kp / 50);
  Kp.set(MY_SYSTEM.Kp);
  Ki.setRange(0, 3 * MY_SYSTEM.Ki, MY_SYSTEM.Ki / 50);
  Ki.set(MY_SYSTEM.Ki);
  Kd.set(0);
}

// Puts our Micromouse motor, its gains and its sampling time from js/my_system.js into the loop.
function useMotor() {
  if (
    ![MY_SYSTEM.K, MY_SYSTEM.tau, MY_SYSTEM.Kp, MY_SYSTEM.Ki].every(
      Number.isFinite,
    )
  ) {
    status.textContent = "Fill in K, tau, Kp and Ki in js/my_system.js first.";
    return;
  }
  setPlant(MY_SYSTEM.K, MY_SYSTEM.tau);
  useMotorGains();
  Ts.set(MY_SYSTEM.Ts * 1000);
  uMaxS.set(0);
  aw.set("off");
  render();
}

const presets = addButtons(document.getElementById("presets"), [
  {
    label: "P only, Kp = 9",
    onClick: () => {
      setPlant(1, 1);
      Kp.set(9);
      Ki.set(0);
      Kd.set(0);
      uMaxS.set(0);
      aw.set("off");
      Ts.set(100);
      render();
    },
  },
  {
    label: "PI 9, 50",
    onClick: () => {
      setPlant(1, 1);
      Kp.set(9);
      Ki.set(50);
      Kd.set(0);
      uMaxS.set(0);
      aw.set("off");
      Ts.set(100);
      render();
    },
  },
  {
    label: "Windup: u limited to 0..2",
    onClick: () => {
      setPlant(1, 1);
      Kp.set(9);
      Ki.set(50);
      Kd.set(0);
      uMaxS.set(2);
      aw.set("off");
      Ts.set(10);
      render();
    },
  },
  { label: "Use our motor", onClick: useMotor },
]);

addButtons(document.getElementById("copyRow"), [
  { label: "Copy the code", onClick: copyCode },
]);

// navigator.clipboard needs HTTPS and can fail on some phones, so there is a fallback that selects the text.
async function copyCode() {
  const note = document.getElementById("copyNote");
  try {
    await navigator.clipboard.writeText(codeBox.textContent);
    note.textContent = "Copied.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(codeBox);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    note.textContent = "Press copy on your device: the code is selected.";
  }
}

function render() {
  rPlant.set(`K = ${fmt(K, 3)}, τ = ${fmt(tau, 3, "s")}`);
  const limited = uMaxS.value > 0;
  const run = {
    ...defaultRun(),
    plant: { type: "first", K, tau },
    Kp: Kp.value,
    Ki: Ki.value,
    Kd: Kd.value,
    Ts: Ts.value / 1000,
    uMin: limited ? 0 : -Infinity,
    uMax: limited ? uMaxS.value : Infinity,
    antiWindup: aw.value === "on",
    T: Math.max(2, 15 * tau),
  };
  const res = simulate(run);
  banner.show(res.t.length === 0 || Number.isNaN(tsLimitP(1, 1, 9)));
  const final = Ki.value > 0 ? 1 : (K * Kp.value) / (1 + K * Kp.value);
  const t = thin(res.t);
  draw(
    "output",
    [
      line(t, thin(res.y), "Output y"),
      line(
        t,
        t.map(() => final),
        "Final value",
        { line: { dash: "dot", color: "#7f8c8d" } },
      ),
    ],
    {
      xaxis: { title: "Time (s)", range: [0, 5 * tau] },
      yaxis: { title: "Output", range: res.diverged ? [-5, 5] : undefined },
    },
  );
  // The stair steps: 'hv' holds each value until the next sample.
  draw(
    "control",
    [
      line(res.t, res.u, "Control signal u", {
        line: { shape: "hv", color: "#b9770e" },
      }),
    ],
    { xaxis: { title: "Time (s)", range: [0, tau] }, yaxis: { title: "u" } },
  );

  status.textContent = res.diverged
    ? "Unstable at this sampling time. With Kd on, the limit on Kd also falls as Ts grows."
    : "";
  if (res.t.length && !res.diverged) {
    const met = readMetrics(res.t, res.y, final);
    rOS.set(met.overshoot === 0 ? "none" : fmt(met.overshoot, 3, "%"));
    rSettle.set(
      met.settling === null ? "does not settle" : fmt(met.settling, 3, "s"),
    );
  } else {
    rOS.set("-");
    rSettle.set("-");
  }
  const lim = tsLimitP(K, tau, Kp.value);
  rLimit.set(lim === null ? "none" : fmt(lim * 1000, 3, "ms"));

  const list = [5, 20, 50, 100, 150, 200, 250].map((v) => v / 1000);
  const sweep = sweepTs({ ...run, T: Math.max(2, 10 * tau) }, list, final);
  const ms = sweep.map((s) => s.Ts * 1000);
  draw(
    "sweepOS",
    [
      line(
        ms,
        sweep.map((s) => s.overshoot),
        "Overshoot (%), a gap means unstable",
        { mode: "lines+markers" },
      ),
    ],
    { xaxis: { title: "Ts (ms)" }, yaxis: { title: "Overshoot (%)" } },
  );
  draw(
    "sweepTs",
    [
      line(
        ms,
        sweep.map((s) => s.settling),
        "Settling (s), a gap means unstable",
        { mode: "lines+markers" },
      ),
    ],
    { xaxis: { title: "Ts (ms)" }, yaxis: { title: "Settling (s)" } },
  );

  codeBox.textContent = arduinoCode({
    Kp: Kp.value,
    Ki: Ki.value,
    Kd: Kd.value,
    Ts: Ts.value / 1000,
    uMin: run.uMin,
    uMax: run.uMax,
    antiWindup: run.antiWindup,
  });
}

addPredict(
  document.getElementById("predict"),
  [
    {
      q: "P only, K<sub>p</sub> = 9. Raise T<sub>s</sub> from 100 ms to 250 ms. What happens?",
      options: [
        "Nothing changes",
        "The loop goes from clean to unstable",
        "It only gets slower",
      ],
      answer: 1,
      why: "The held u acts as a delay. The limit here is 223 ms.",
    },
    {
      q: "PI 9, 50 with u limited to 0..2. Turn anti-windup on. What happens to the overshoot?",
      options: ["It grows", "It falls sharply", "No change"],
      answer: 1,
      why: "From 49.5% to 1.3%. The sum stops growing while u sits at its limit.",
    },
  ],
  [Ts, Kp, Ki, Kd, uMaxS, lockable(presets)],
);

render();
