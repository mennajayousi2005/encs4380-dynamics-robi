// The sensor models from the lecture. Each owner fills in their own section only.
// A function that is still a TODO returns NaN, so the page keeps working and its check shows "To do".

// ===== MODULE 1. OWNER: Menna =====

// First-order step response at time t, for a step of size A.
// Equation: y = K A (1 - e^(-t/tau))
export function firstOrderStep(t, K, A, tau) {
  // TODO(Menna): return the equation above. Check 1 turns green when it is right.
  return NaN;
}

// First-order response at time t to a ramp input x = R t.
// Equation: y = K R (t - tau + tau e^(-t/tau))
export function firstOrderRamp(t, K, R, tau) {
  // TODO(Menna): return the equation above.
  return NaN;
}

// ln of the error fraction for a step. e = 1 - y/(K A), and it should equal e^(-t/tau).
export function lnErrorFraction(y, K, A) {
  // TODO(Menna):
  // 1. Compute e = 1 - y / (K * A).
  // 2. If e <= 0 return NaN, since ln of zero or a negative number is not defined.
  // 3. Otherwise return Math.log(e).
  return NaN;
}

// Least-squares slope of y against x, skipping any NaN points. Module 1 prints it next to -1/tau.
// Equation: slope = sum((x - xMean)(y - yMean)) / sum((x - xMean)^2)
export function fitSlope(xs, ys) {
  // TODO(Menna):
  // 1. Keep only the pairs where y is a real number.
  // 2. Compute the two means.
  // 3. Compute the top and bottom sums and return top / bottom.
  return NaN;
}

// ===== MODULE 2. OWNER: Nada =====

// Amplitude ratio at frequency w (rad/s). Equation: M = 1 / sqrt(1 + (w tau)^2)
export function ampRatio(w, tau) {
  // TODO(Nada): return the equation above. Part of check 2.
  return NaN;
}

// Phase in degrees. It is negative, because the output lags. Equation: phi = -atan(w tau)
export function phaseDeg(w, tau) {
  // TODO(Nada): return the equation above, converted from radians to degrees.
  return NaN;
}

// Dynamic error. Equation: delta = M - 1. It is negative for this sensor.
export function dynamicError(M) {
  // TODO(Nada): return the equation above.
  return NaN;
}

// Largest tau that keeps the error within maxError (0.05 means 5%) up to fMax (Hz).
// Equation: tauMax = sqrt(1 / (1 - maxError)^2 - 1) / (2 pi fMax)
export function tauMax(fMax, maxError) {
  // TODO(Nada): return the equation above. Do not use the small-angle shortcut: it gives
  // 0.503 ms and fails check 3. The right answer for 100 Hz and 5% is 0.523 ms.
  return NaN;
}

// Settled output at time t for the input A sin(w t), with K = 1.
// Equation: y = A M sin(w t + phi), with phi in radians.
export function sineSteady(t, A, w, tau) {
  // TODO(Nada): return the equation above, using ampRatio. Remember phaseDeg gives degrees.
  return NaN;
}

// ===== MODULE 3. OWNER: Rand =====

// Converts mass, damper and spring into { wn, zeta, K }.
// Equations: wn = sqrt(k/m), zeta = b / (2 sqrt(k m)), K = 1/k
export function msdParams(m, b, k) {
  // TODO(Rand): return { wn, zeta, K } from the equations above.
  return { wn: NaN, zeta: NaN, K: NaN };
}

// Second-order step response at time t, normalised so that the final value is 1.
// Underdamped: y = 1 - e^(-zeta wn t) (cos(wd t) + zeta / sqrt(1 - zeta^2) sin(wd t)), wd = wn sqrt(1 - zeta^2)
// Critical:    y = 1 - (1 + wn t) e^(-wn t)
// Overdamped:  y = 1 - (p2 e^(-p1 t) - p1 e^(-p2 t)) / (p2 - p1), p1,2 = wn (zeta -+ sqrt(zeta^2 - 1))
export function secondOrderStep(t, zeta, wn) {
  // TODO(Rand):
  // 1. If |zeta - 1| < 1e-6, use the critical branch. The other two divide by zero at zeta = 1.
  // 2. If zeta < 1, use the underdamped branch.
  // 3. Otherwise use the overdamped branch.
  return NaN;
}

// Time window long enough to show the whole response.
// At least 8 / (zeta wn) when underdamped, and 8 / p1 (the slower pole) otherwise, never above 60 s.
export function timeWindow(zeta, wn) {
  // TODO(Rand): return the window above. b = 0 gives zeta = 0, which is why the 60 s cap is needed.
  return NaN;
}

// The two poles of G(s) as [{ re, im }, { re, im }]. Equation: s = -zeta wn +- wn sqrt(zeta^2 - 1)
export function poles(zeta, wn) {
  // TODO(Rand): compute from zeta and wn only, never from the matrix A. Handle zeta < 1, where the
  // square root is imaginary. Part of check 6.
  return [{ re: NaN, im: NaN }, { re: NaN, im: NaN }];
}

// The state-space matrices. A = [[0, 1], [-k/m, -b/m]] and B = [0, 1/m]
export function stateMatrices(m, b, k) {
  // TODO(Rand): return { A, B } with the values above.
  return { A: [[NaN, NaN], [NaN, NaN]], B: [NaN, NaN] };
}

// Eigenvalues of a 2 by 2 matrix as [{ re, im }, { re, im }].
// Equation: lambda = (tr +- sqrt(tr^2 - 4 det)) / 2
export function eigenvalues2x2(A) {
  // TODO(Rand): compute from the entries of A only, never from zeta or wn. If both this function and
  // poles() shared a line of code, "they are the same numbers" would prove nothing.
  return [{ re: NaN, im: NaN }, { re: NaN, im: NaN }];
}
