// Our Micromouse motor. OWNER: Nada, with whoever handles the motors in the project.
// TODO(Nada): fill this in from the PWM step test (arduino/step_test/step_test.ino logs the data).
// Real numbers only: the page says where they came from, and marks depend on it.
export const MY_SYSTEM = {
  motor: '', // which motor we tested, for example 'left drive motor'
  K: null, // change in speed divided by change in PWM
  kUnits: '', // for example 'rad/s per % PWM'
  tau: null, // in seconds, from the 63.2% point or the ln(e) slope
  Kp: null, // the final gains: copy them from the My system page once you have chosen the design
  Ki: null,
  Ts: 0.005, // sampling time in s: a whole number of ms, and at most tau / 10
  source: '', // for example 'PWM step test on 20 Nov, 40% to 70%, logged with the encoder'
  conditions: '', // for example 'on the bench, one motor with wheel, TB6612FNG, 2S battery fully charged'
  spec: '', // the spec we chose
  why: '', // why it matters for the mouse, for example stopping within 5 mm of a 180 mm cell, or wheel slip on the slick floor
  speedStep: 1, // a step in speed that the mouse really uses, in the same units as the speed in K.
  // speedStep / K is the steady PWM it needs, and it must be well under 100%. The page shows it.
};
