export const MY_SYSTEM = {
  motor: 'N20 DC Motor with Magnetic Encoder – 6V 530 RPM (one drive motor)',

  K: 0.685, // Estimated motor gain from no-load speed
  kUnits: 'rad/s per % PWM',
  tau: 0.05,
  Kp: 2.63, // PI gain from the design
  Ki: 89.4, // PI gain from the design (zeta = 0.8, wn = 35 rad/s)
  Ts: 0.005, // Sampling time: 5 ms
  source: 'Robotics store page (N20 DC Motor with Magnetic Encoder – 6V 530 RPM, SKU ROBO-18014): K from the 530 RPM no-load speed at 6 V, scaled to the 7.4 V battery',
  conditions: 'Planned bench test: N20 + wheel, DRV8833, ESP32, 2S 7.4 V battery',
  spec: 'speed step of 23.5 rad/s (0.4 m/s with a 34 mm wheel) with overshoot below 10%, settling time below 0.2 s, and peak PWM below 81% (6 V rated motor on a 7.4 V battery)',
  why: 'too much overshoot makes the mouse pass its stopping point in a 180 mm cell; a hard start makes the wheels slip, so the encoder distance becomes wrong; the motor is rated 6 V, so the command must stay below 6/7.4 = 81% PWM',
  speedStep: 23.5, // Target wheel speed in rad/s
};