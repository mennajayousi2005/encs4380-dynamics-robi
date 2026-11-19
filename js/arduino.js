// The Arduino code generator. OWNER: Rand. P3 and My system both show its output.

// Returns the Arduino sketch as a string, for { Kp, Ki, Kd, Ts, uMin, uMax, antiWindup }.
// The sketch must run the same formula and the same rules as simulate() in engine.js.
export function arduinoCode({ Kp, Ki, Kd, Ts, uMin, uMax, antiWindup }) {
  const low = Number.isFinite(uMin) ? uMin : 0;
  const high = Number.isFinite(uMax) ? uMax : 100;
  // TODO(Rand): build and return the sketch as a template string. It must contain, in this order:
  // 1. Constants: Kp, Ki, Kd, Ts in SECONDS, uMin, uMax, and the actuator and sensor pins.
  // 2. Variables: float sum = 0, float ePrev, bool first = true, unsigned long lastTime.
  // 3. setup(): set the pin modes and lastTime = millis().
  // 4. loop(): run only when millis() - lastTime >= TS_MS, then add TS_MS to lastTime. Emit TS_MS as the rounded
  //    whole number Math.round(Ts * 1000): on an Arduino, float(0.251) * 1000 truncates to 250.
  // 5. Read the sensor into y, and e = setpoint - y.
  // 6. The same e[-1] rule as the simulator: if first, set ePrev = e and first = false.
  // 7. newSum = sum + e; u = Kp*e + Ki*Ts*newSum + Kd*(e - ePrev)/Ts; clip u to uMin..uMax.
  // 8. If antiWindup is on: when the clipped value differs, keep the old sum and recompute u. Otherwise sum = newSum.
  // 9. analogWrite(pin, u * 255.0 / 100.0), since u is in percent and analogWrite takes 0..255.
  // 10. ePrev = e.
  // Then paste one output into the Arduino IDE or Wokwi and compile it, with anti-windup on and off.
  // Hand-check the first three u values on the unlimited PI 9, 50 preset at Ts = 10 ms: with a limit they all saturate.
  return `// TODO(Rand): arduinoCode in js/arduino.js. Kp=${Kp} Ki=${Ki} Kd=${Kd} Ts=${Ts} u=${low}..${high} antiWindup=${antiWindup}`;
}
