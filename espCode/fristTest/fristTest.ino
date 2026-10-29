#include <Arduino.h>
#include <DHT.h>

// ── Pin definitions (from diymore_012592 template) ────────────────
#define DHT_PIN     22   // DHT11 data pin
#define SOIL_PIN    32   // Capacitive soil sensor (ADC)
#define BATTERY_PIN 34   // Battery voltage divider
#define LED_STATUS  16   // LedLink — blue status LED
#define LED_1       33   // Led1 — red LED

#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// ── LED blink state ───────────────────────────────────────────────
unsigned long lastBlink    = 0;
unsigned long lastRead     = 0;
bool          ledState     = false;
const long    BLINK_NORMAL = 1000;  // 1s blink = all OK
const long    BLINK_ERROR  = 200;   // fast blink = sensor error
const long    READ_INTERVAL = 2000; // read every 2s

// ── Battery ───────────────────────────────────────────────────────
float readBatteryVoltage() {
  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(BATTERY_PIN);
    delay(5);
  }
  float raw     = sum / 10.0;
  float voltage = (raw / 4095.0) * 3.3 * 2.0;  // x2 for voltage divider
  return voltage;
}

float batteryPercent(float voltage) {
  // 18650: 4.2V = 100%, 3.0V = 0%
  float pct = (voltage - 3.0) / (4.2 - 3.0) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  delay(1000);

  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_1,      OUTPUT);

  digitalWrite(LED_STATUS, LOW);
  digitalWrite(LED_1,      LOW);

  dht.begin();

  Serial.println("\nIOSeeds ESP32 - Sensor test");
  Serial.println("================================");
  Serial.println("DHT_PIN    : GPIO22");
  Serial.println("SOIL_PIN   : GPIO32");
  Serial.println("BATTERY_PIN: GPIO34");
  Serial.println("LED_STATUS : GPIO16");
  Serial.println("LED_1      : GPIO33");
  Serial.println("================================\n");
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Sensor readings every 2s ──────────────────────────────────
  if (now - lastRead >= READ_INTERVAL) {
    lastRead = now;

    // ── DHT11 ──────────────────────────────────────────────────
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    bool  dhtError    = isnan(temperature) || isnan(humidity);

    // ── Soil moisture ───────────────────────────────────────────
    int   rawSoil     = analogRead(SOIL_PIN);
    float soilPct     = map(rawSoil, 4095, 1500, 0, 100);
    soilPct           = constrain(soilPct, 0.0, 100.0);

    // ── Battery ─────────────────────────────────────────────────
    float battVoltage = readBatteryVoltage();
    float battPct     = batteryPercent(battVoltage);
    bool  battLow     = battPct < 20.0;

    // ── Print ───────────────────────────────────────────────────
    Serial.println("------------------------------");

    if (dhtError) {
      Serial.println("DHT11 ERROR - check GPIO22 wiring");
    } else {
      Serial.print("Temperature  : ");
      Serial.print(temperature, 1);
      Serial.println(" C");

      Serial.print("Air Humidity : ");
      Serial.print(humidity, 1);
      Serial.println(" %");
    }

    Serial.print("Soil raw     : ");
    Serial.print(rawSoil);
    Serial.println(" (0-4095)");

    Serial.print("Soil moisture: ");
    Serial.print(soilPct, 1);
    Serial.println(" %");

    Serial.print("Battery      : ");
    Serial.print(battVoltage, 2);
    Serial.print(" V  (");
    Serial.print(battPct, 0);
    Serial.println(" %)");

    if (battLow) {
      Serial.println("WARNING: Battery LOW - charge soon");
    }

    Serial.println("------------------------------\n");

    // ── LED 1 (red) — error or battery low ─────────────────────
    digitalWrite(LED_1, (dhtError || battLow) ? HIGH : LOW);
  }

  // ── LED STATUS (blue) blink — non-blocking ────────────────────
  // Determine blink speed based on DHT error
  // We re-read dhtError flag via a static variable to avoid
  // reading sensors again just for the blink
  static bool lastDhtError = false;
  float t = dht.readTemperature();
  lastDhtError = isnan(t);

  long blinkInterval = lastDhtError ? BLINK_ERROR : BLINK_NORMAL;

  if (now - lastBlink >= blinkInterval) {
    lastBlink = now;
    ledState  = !ledState;
    digitalWrite(LED_STATUS, ledState ? HIGH : LOW);
  }
}