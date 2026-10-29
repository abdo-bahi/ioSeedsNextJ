#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>

// ── IOSeeds API ───────────────────────────────────────────────────
#ifndef WIFI_SSID
#define WIFI_SSID "your_wifi_ssid"
#endif
#ifndef WIFI_PASS
#define WIFI_PASS "your_wifi_password"
#endif
#ifndef API_BASE_URL
#define API_BASE_URL "http://localhost:8000/api/trpc"
#endif
#ifndef MCU_API_KEY
#define MCU_API_KEY "your_mcu_api_key_here"
#endif

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

// ── WiFi ───────────────────────────────────────────────────────────
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASS;

void connectWiFi() {
  Serial.print("Connecting WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" ✓");
}

// ── HTTP helper ────────────────────────────────────────────────────
#include <HTTPClient.h>

bool sendSensorData(float temperature, float humidity,
                    int soilRaw, float soilPct,
                    float battVoltage, float battPct,
                    bool dhtError, bool battLow) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(API_BASE_URL) + "/data.sendReadings";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", MCU_API_KEY);  // <-- MCU API key

  // Build JSON payload
  String json = "{\"mcuid\":\"cmsj9pj4s000zkcbiwo80bdas\"";
  json += ",\"temperature\":" + String(temperature, 1);
  json += ",\"humidity\":" + String(humidity, 1);
  json += ",\"soil_raw\":" + String(soilRaw);
  json += ",\"soil_pct\":" + String(soilPct, 1);
  json += ",\"batt_volt\":" + String(battVoltage, 2);
  json += ",\"batt_pct\":" + String(battPct, 0);
  json += ",\"dht_error\":" + String(dhtError ? 1 : 0);
  json += ",\"batt_low\":" + String(battLow ? 1 : 0);
  json += "}";

  int httpCode = http.POST(json);
  bool ok = (httpCode >= 200 && httpCode < 300);
  if (!ok) {
    Serial.printf("POST failed: %d %s\n", httpCode, http.getString().c_str());
  } else {
    Serial.printf("POST OK (%d)\n", httpCode);
  }
  http.end();
  return ok;
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);  // faster debug
  delay(1000);

  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_1,      OUTPUT);

  digitalWrite(LED_STATUS, LOW);
  digitalWrite(LED_1,      LOW);

  dht.begin();

  connectWiFi();

  Serial.println("\nIOSeeds ESP32 - Sensor test");
  Serial.println("================================");
  Serial.println("DHT_PIN    : GPIO22");
  Serial.println("SOIL_PIN   : GPIO32");
  Serial.println("BATTERY_PIN: GPIO34");
  Serial.println("LED_STATUS : GPIO16");
  Serial.println("LED_1      : GPIO33");
  Serial.println("MCU_API_KEY: " + String(MCU_API_KEY));
  Serial.println("================================\n");
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Reconnect WiFi if lost ──────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

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

    // ── Send to IOSeeds backend ─────────────────────────────────
    sendSensorData(temperature, humidity, rawSoil, soilPct,
                   battVoltage, battPct, dhtError, battLow);

    // ── Print (debug) ───────────────────────────────────────────
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
  static bool lastDhtError = false;
  // Re-read only temperature for blink logic (cheap vs full payload)
  float t = dht.readTemperature();
  lastDhtError = isnan(t);

  long blinkInterval = lastDhtError ? BLINK_ERROR : BLINK_NORMAL;

  if (now - lastBlink >= blinkInterval) {
    lastBlink = now;
    ledState  = !ledState;
    digitalWrite(LED_STATUS, ledState ? HIGH : LOW);
  }
}