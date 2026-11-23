#include <Arduino.h>

const int PIN_AIN1 = 25, PIN_AIN2 = 26, PIN_SLEEP = 27;
const int PIN_ENC_A = 32, PIN_ENC_B = 33;
const uint32_t PWM_FREQ_HZ = 20000;
const uint8_t PWM_BITS = 10;
const uint8_t PWM_CHANNEL = 0;

const float ENC_PPR_MOTOR = 7.0f;
const float GEAR_RATIO = 30.0f;
const float COUNTS_PER_OUTPUT_REV_MEASURED = 840.0f;
const int ENC_DIRECTION = 1; // set -1 if forward rotation produces negative counts

const float MOTOR_RATED_V = 6.0f;
const float BATTERY_MAX_V = 8.4f;
const float PWM_LOW = 40.0f, PWM_HIGH = 70.0f;
const uint32_t RAMP_MS = 300, SETTLE_TIMEOUT_MS = 3000;
const uint32_t PRE_STEP_MS = 500, POST_STEP_MS = 1500;
const uint32_t SAMPLE_US = 2000; // 25 samples in 0.05 s
const int PRE_N = PRE_STEP_MS * 1000UL / SAMPLE_US;
const int POST_N = POST_STEP_MS * 1000UL / SAMPLE_US;
const int TOTAL_N = PRE_N + POST_N + 1;

struct Sample
{
  uint32_t timeUs;
  int32_t count;
  uint8_t pwmPct;
};
Sample samples[TOTAL_N];
volatile int32_t encoderCount = 0;
volatile uint8_t encoderState = 0;
portMUX_TYPE encoderMux = portMUX_INITIALIZER_UNLOCKED;
const int8_t QDEC[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
float currentPwm = 0;

void IRAM_ATTR encoderISR()
{
  uint8_t state = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  portENTER_CRITICAL_ISR(&encoderMux);
  encoderCount += QDEC[(encoderState << 2) | state];
  encoderState = state;
  portEXIT_CRITICAL_ISR(&encoderMux);
}
int32_t readCount()
{
  portENTER_CRITICAL(&encoderMux);
  int32_t value = encoderCount;
  portEXIT_CRITICAL(&encoderMux);
  return value;
}
void zeroCount()
{
  portENTER_CRITICAL(&encoderMux);
  encoderCount = 0;
  portEXIT_CRITICAL(&encoderMux);
}
float countsPerOutputRev()
{
  return COUNTS_PER_OUTPUT_REV_MEASURED > 0 ? COUNTS_PER_OUTPUT_REV_MEASURED : 4.0f * ENC_PPR_MOTOR * GEAR_RATIO;
}
float speedRadS(int32_t deltaCount, uint32_t deltaUs)
{
  if (!deltaUs || countsPerOutputRev() <= 0)
    return NAN;
  return ENC_DIRECTION * (float)deltaCount * TWO_PI * 1e6f / (countsPerOutputRev() * deltaUs);
}
float pwmLimit() { return fminf(100.0f, 100.0f * MOTOR_RATED_V / BATTERY_MAX_V); }
void writeDuty(uint32_t duty)
{
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PIN_AIN1, duty);
#else
  ledcWrite(PWM_CHANNEL, duty);
#endif
}
void setPwm(float percent)
{
  percent = fmaxf(0.0f, fminf(percent, pwmLimit()));
  uint32_t duty = (uint32_t)lroundf(percent * ((1UL << PWM_BITS) - 1) / 100.0f);
  writeDuty(duty);
  currentPwm = percent;
}
void motorStop()
{
  setPwm(0);
  digitalWrite(PIN_AIN2, LOW);
  if (PIN_SLEEP >= 0)
    digitalWrite(PIN_SLEEP, LOW);
}
bool abortRequested()
{
  bool stop = false;
  while (Serial.available())
  {
    char ch = Serial.read();
    if (ch != '\n' && ch != '\r')
      stop = true;
  }
  return stop;
}
// Poll emergency stop while measuring a 100 ms average speed.
bool measureSpeed100(float &speed)
{
  uint32_t startUs = micros();
  int32_t startCount = readCount();
  while ((uint32_t)(micros() - startUs) < 100000UL)
  {
    if (abortRequested())
      return false;
    delay(1);
  }
  uint32_t endUs = micros();
  speed = speedRadS(readCount() - startCount, endUs - startUs);
  return true;
}
bool waitForSteadySpeed()
{
  float previous = 0;
  if (!measureSpeed100(previous))
    return false;
  uint32_t started = millis();
  int stable = 0;
  while ((uint32_t)(millis() - started) < SETTLE_TIMEOUT_MS)
  {
    float now = 0;
    if (!measureSpeed100(now))
      return false;
    if (now > 1.0f && fabsf(now - previous) <= 0.02f * now)
      ++stable;
    else
      stable = 0;
    previous = now;
    if (stable >= 3)
      return true;
  }
  Serial.println("# WARNING: speed not steady within timeout");
  return false;
}
void runStepTest()
{
  if (countsPerOutputRev() <= 0)
  {
    Serial.println("# ERROR: encoder scale missing");
    return;
  }
  if (PWM_HIGH > pwmLimit())
  {
    Serial.println("# ERROR: high PWM exceeds configured cap");
    return;
  }
  Serial.printf("# Encoder scale: %.1f x4 counts/output revolution (verify calibration)\n", countsPerOutputRev());
  Serial.println("# Remove wheel load; confirm safe supply, wiring, and rotation direction");
  digitalWrite(PIN_AIN2, LOW);
  if (PIN_SLEEP >= 0)
  {
    digitalWrite(PIN_SLEEP, HIGH);
    delay(2);
  }
  for (int i = 1; i <= 20; ++i)
  {
    if (abortRequested())
    {
      motorStop();
      Serial.println("# aborted");
      return;
    }
    setPwm(PWM_LOW * i / 20.0f);
    delay(RAMP_MS / 20);
  }
  if (!waitForSteadySpeed())
  {
    motorStop();
    Serial.println("# stopped: no steady speed or aborted");
    return;
  }
  uint32_t nextUs = micros();
  samples[0] = {nextUs, readCount(), (uint8_t)lroundf(currentPwm)};
  uint32_t stepUs = 0;
  for (int i = 1; i < TOTAL_N; ++i)
  {
    nextUs += SAMPLE_US;
    while ((int32_t)(micros() - nextUs) < 0)
    {
      if (abortRequested())
      {
        motorStop();
        Serial.println("# aborted");
        return;
      }
    }
    uint32_t nowUs = micros();
    int32_t nowCount = readCount();
    if (i == PRE_N)
    {
      // This sample is the last 40% sample; the step happens immediately AFTER it.
      samples[i] = {nowUs, nowCount, (uint8_t)lroundf(PWM_LOW)};
      setPwm(PWM_HIGH);
      stepUs = micros();
    }
    else
    {
      samples[i] = {nowUs, nowCount, (uint8_t)lroundf(currentPwm)};
    }
    if (abortRequested())
    {
      motorStop();
      Serial.println("# aborted");
      return;
    }
  }
  motorStop();
  Serial.println("time_s,pwm_pct,counts,speed_rad_s");
  for (int i = 1; i < TOTAL_N; ++i)
  {
    float t = (int32_t)(samples[i].timeUs - stepUs) * 1e-6f;
    float w = speedRadS(samples[i].count - samples[i - 1].count,
                        samples[i].timeUs - samples[i - 1].timeUs);
    Serial.printf("%.6f,%u,%ld,%.4f\n", t, samples[i].pwmPct,
                  (long)(samples[i].count - samples[0].count), w);
  }
  // Average over windows to reduce encoder quantization noise.
  const int preWindow = 50, postWindow = 125;
  float w40 = speedRadS(samples[PRE_N].count - samples[PRE_N - preWindow].count,
                        samples[PRE_N].timeUs - samples[PRE_N - preWindow].timeUs);
  int last = TOTAL_N - 1;
  float w70 = speedRadS(samples[last].count - samples[last - postWindow].count,
                        samples[last].timeUs - samples[last - postWindow].timeUs);
  Serial.printf("# speed_40=%.3f rad/s, speed_70=%.3f rad/s\n", w40, w70);
  Serial.printf("# K_estimate=%.4f rad/s per %%PWM\n", (w70 - w40) / (PWM_HIGH - PWM_LOW));
  float countsPerSample70 = (float)(samples[last].count - samples[last - postWindow].count) / postWindow;
  Serial.printf("# counts_per_sample_at_70pct=%.2f (absolute %.2f)\n", countsPerSample70, fabsf(countsPerSample70));
  Serial.printf("# tau_63_percent_level=%.3f rad/s; find its crossing time on plot\n", w40 + 0.632f * (w70 - w40));
  Serial.println("# done; motor stopped");
}
void setup()
{
  pinMode(PIN_AIN2, OUTPUT);
  digitalWrite(PIN_AIN2, LOW);
  if (PIN_SLEEP >= 0)
  {
    pinMode(PIN_SLEEP, OUTPUT);
    digitalWrite(PIN_SLEEP, LOW);
  }
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  if (!ledcAttach(PIN_AIN1, PWM_FREQ_HZ, PWM_BITS))
  {
    Serial.begin(115200);
    Serial.println("# PWM attach failed");
    while (true)
      delay(1000);
  }
#else
  ledcSetup(PWM_CHANNEL, PWM_FREQ_HZ, PWM_BITS);
  ledcAttachPin(PIN_AIN1, PWM_CHANNEL);
#endif
  setPwm(0);
  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
  encoderState = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), encoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), encoderISR, CHANGE);
  Serial.begin(115200);
  delay(200);
  Serial.println("# N20 open-loop step test; s=start, c=count, z=zero");
  Serial.println("# WARNING: 840 counts/rev is an unverified estimate. Calibrate: z, 10 output turns, c; set abs(count)/10 in code");
}
void loop()
{
  if (!Serial.available())
    return;
  char cmd = Serial.read();
  while (Serial.available())
    Serial.read();
  if (cmd == 's')
    runStepTest();
  else if (cmd == 'c')
    Serial.printf("# count=%ld\n", (long)readCount());
  else if (cmd == 'z')
  {
    zeroCount();
    Serial.println("# encoder zeroed");
  }
}
