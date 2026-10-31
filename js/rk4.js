// Our own RK4 solver. OWNER: Rand. This must be our own code to count for the bonus,
// not the simulator from Section 7.1 of the notes. Homework 2 builds on this file.

// One RK4 step. f(x, u) returns dx/dt as an array, x is the state array, u the input, dt the step.
// k1 = f(x, u)
// k2 = f(x + dt/2 k1, u)
// k3 = f(x + dt/2 k2, u)
// k4 = f(x + dt k3, u)
// next x = x + dt/6 (k1 + 2 k2 + 2 k3 + k4)
export function rk4Step(f, x, u, dt) {
  // TODO(Rand): compute the four slopes and return the new state as a new array.
  return x.map(() => NaN);
}

// Steps the mass-spring-damper for a constant force F, from rest, using rk4Step.
// x1' = x2 and x2' = (F - b x2 - k x1) / m
// Returns { t, x1, x2 } as arrays, with a sample every dt up to time T.
export function simulateMSD(m, b, k, F, T, dt) {
  // TODO(Rand):
  // 1. Write f(x, u) from the two equations above, with u = F.
  // 2. Start at x = [0, 0], and repeat rk4Step until T, storing t, x1 and x2 at each step.
  return { t: [], x1: [], x2: [] };
}
