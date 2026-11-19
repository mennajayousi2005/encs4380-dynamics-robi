// PWM step test for one Micromouse drive motor. OWNER: Nada, with whoever handles the motors in the project.
// It holds one PWM value, steps to a higher one, and prints time, PWM and speed over Serial.
// Copy the Serial output into a spreadsheet, then read K and tau with the Homework 1 methods.
//
// TODO(Nada): set the pins and encoder counts below for our ESP32 and TB6612FNG wiring.
// This sketch is a starting point: it has not been compiled or run on our hardware.

const int MOTOR_PWM_PIN = 25;    // PWMA on the TB6612FNG
const int MOTOR_IN1_PIN = 26;    // AIN1
const int MOTOR_IN2_PIN = 27;    // AIN2
const int MOTOR_STBY_PIN = 14;   // STBY
const int ENCODER_A_PIN = 32;    // encoder channel A
const float COUNTS_PER_REV = 12; // counts per WHEEL revolution: motor counts x gear ratio

const int PWM_LOW_PERCENT = 40;  // start in mid range, as motors have a dead zone at low PWM
const int PWM_HIGH_PERCENT = 70;
const unsigned long HOLD_MS = 3000;  // time at each level; make it at least 5 tau
// Aim for at least 20 samples within tau, and at least 20 counts per sample at full speed.
// Too few counts per sample makes the speed jump in big steps, and then tau cannot be read.
// Counts per sample = wheel rev/s x COUNTS_PER_REV x SAMPLE_MS / 1000. Raise SAMPLE_MS if it is too low.
const unsigned long SAMPLE_MS = 5;

volatile long counts = 0;

void IRAM_ATTR onEncoder() {
  counts++;
}

void setPwmPercent(int percent) {
  analogWrite(MOTOR_PWM_PIN, percent * 255 / 100);
}

// Prints time, PWM and speed every SAMPLE_MS for durationMs. Times start at startOffsetMs.
void logSpeed(long startOffsetMs, unsigned long durationMs, int pwmPercent) {
  unsigned long start = millis();
  unsigned long next = start;
  noInterrupts();
  long lastCounts = counts;
  interrupts();
  while (millis() - start < durationMs) {
    if (millis() < next) continue;
    next += SAMPLE_MS;
    noInterrupts();
    long now = counts;
    interrupts();
    float revs = (now - lastCounts) / COUNTS_PER_REV;
    float speed = revs * 6.28318 / (SAMPLE_MS / 1000.0);
    lastCounts = now;
    Serial.print((startOffsetMs + (long)(millis() - start)) / 1000.0, 3);
    Serial.print(',');
    Serial.print(pwmPercent);
    Serial.print(',');
    Serial.println(speed, 3);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  pinMode(MOTOR_IN1_PIN, OUTPUT);
  pinMode(MOTOR_IN2_PIN, OUTPUT);
  pinMode(MOTOR_STBY_PIN, OUTPUT);
  pinMode(ENCODER_A_PIN, INPUT_PULLUP);
  digitalWrite(MOTOR_STBY_PIN, HIGH);
  digitalWrite(MOTOR_IN1_PIN, HIGH);
  digitalWrite(MOTOR_IN2_PIN, LOW);
  attachInterrupt(digitalPinToInterrupt(ENCODER_A_PIN), onEncoder, RISING);

  // Settle at the low level first, so the step starts from a steady speed.
  setPwmPercent(PWM_LOW_PERCENT);
  delay(HOLD_MS);

  // Log the last part of the low level as well: K needs the speed before the step.
  Serial.println("time_s,pwm_percent,speed_rad_s");
  const long BEFORE_MS = 500;
  logSpeed(-BEFORE_MS, BEFORE_MS, PWM_LOW_PERCENT);
  setPwmPercent(PWM_HIGH_PERCENT);
  logSpeed(0, HOLD_MS, PWM_HIGH_PERCENT);
  setPwmPercent(0);
}

void loop() {
}
