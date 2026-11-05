// Our own RK4 solver. OWNER: Rand.
// Homework 2 builds on this file.

// Helper: returns the new array x + h * v, element by element. Used to build the trial states of RK4.
function addScaled(x, v, h) {
  return x.map((xi, i) => xi + h * v[i]);
}

// One RK4 step. f(x, u) returns dx/dt as an array, x is the state array, u the input, dt the step.
// k1 = f(x, u)
// k2 = f(x + dt/2 k1, u)
// k3 = f(x + dt/2 k2, u)
// k4 = f(x + dt k3, u)
// next x = x + dt/6 (k1 + 2 k2 + 2 k3 + k4)
export function rk4Step(f, x, u, dt) {
  const k1 = f(x, u); // slope at the start of the step
  const k2 = f(addScaled(x, k1, dt / 2), u); // slope at the middle, using k1
  const k3 = f(addScaled(x, k2, dt / 2), u); // slope at the middle again, using k2
  const k4 = f(addScaled(x, k3, dt), u); // slope at the end, using k3
  // Weighted average of the four slopes: the two middle ones count twice.
  return x.map(
    (xi, i) => xi + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]),
  );
}
// Steps the mass-spring-damper for a constant force F, from rest, using rk4Step.
// x1' = x2 and x2' = (F - b x2 - k x1) / m
// Returns { t, x1, x2 } as arrays, with a sample every dt up to time T.
export function simulateMSD(m, b, k, F, T, dt) {
  const t = [];
  const x1 = [];
  const x2 = [];
  if (!(T > 0) || !(dt > 0)) return { t, x1, x2 }; // nothing to simulate

  // 1. The state equations: x = [displacement, velocity], u = force.
  const f = (x, u) => [x[1], (u - b * x[1] - k * x[0]) / m];

  // 2. Start from rest and step forward until T.
  // Time is i * dt rather than adding dt each step, so rounding errors do not build up.
  const steps = Math.round(T / dt);
  let x = [0, 0];
  for (let i = 0; i <= steps; i++) {
    t.push(i * dt);
    x1.push(x[0]);
    x2.push(x[1]);
    x = rk4Step(f, x, F, dt);
  }
  return { t, x1, x2 };
}
