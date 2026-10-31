// Reads performance numbers off a sampled curve. OWNER: Rand. Homework 2 uses this file too.

// Reads the metrics from sampled arrays t and y. final is the value the curve settles to.
// Definitions from the lecture:
//   rise time = the time to reach 90% of the full response (slide 69);
//   overshoot = (peak - final) / |final| in percent;
//   settling time = when y last leaves a band around final. Slide 69 says "a specific band". Our default of 2%
//   matches ts = 4 / (zeta wn) in the PID tutorial; the figures on slides 63 and 68 draw 5%, so Module 3 shows both.
// Returns { rise, peakTime, overshoot, settling }. Use null where a value does not exist.
export function readMetrics(t, y, final, band = 0.02) {
  // TODO(Rand):
  // 1. Rise: find the first sample at or above 90% of final. rise = its time, minus t[0].
  //    If 90% is never reached, rise = null.
  // 2. Peak: find the largest y and its time.
  // 3. Overshoot: (peak - final) / |final| * 100. Clamp at 0, since rounding can give a tiny negative.
  //    If the overshoot is below 0.01, set peakTime = null, as there is no real peak.
  // 4. Settling: walk backwards from the end to the last sample outside band * |final|.
  //    If the very last sample is outside, settling = null (it does not settle in this window).
  //    Otherwise settling = the time of the next sample, or 0 if no sample is outside.
  return { rise: NaN, peakTime: NaN, overshoot: NaN, settling: NaN };
}
