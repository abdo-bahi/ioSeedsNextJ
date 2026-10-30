#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── WiFi ──────────────────────────────────────────────────────────
const char* WIFI_SSID     = "IdoomFibre_Bh";
const char* WIFI_PASSWORD = "tMtkKH96";

// ── MQTT broker ───────────────────────────────────────────────────
const char* MQTT_BROKER = "192.168.100.35";
const int   MQTT_PORT   = 28883;
const char* MQTT_USER   = "admin";
const char* MQTT_PASS   = "ioseeds2026";

// ── IOSeeds IDs ───────────────────────────────────────────────────
const char* FARM_ID     = "cmuzxl6ym0012u8bi1wb492yk";
const char* FIELD_ID    = "cmuzxl6yx0013u8bi9qfvg25u";
const char* MCU_ID      = "cmuzxl6zi0016u8bixk8c69xi";
const char* SENSOR_ID   = "cmsj9pj5l0012kcbi3k07j4f6"; // soil-moisture sensor
const char* ACTUATOR_ID = "cmuzxl70t001du8bifgcscybc";
const char* API_KEY     = "61f361be19768ed0d66da9ab2c31c12d4bd3167cfb7c4f960c4791b674aefb7a";

// ── Pins ──────────────────────────────────────────────────────────
#define DHT_PIN     22   // DHT11 data pin
#define SOIL_PIN    32   // Capacitive soil sensor (ADC)
#define BATTERY_PIN 34   // Battery voltage divider
#define LED_STATUS  16   // LedLink — blue status LED
#define LED_1       33   // Led1 — red LED
#define DHT_TYPE    DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// ── Timing ────────────────────────────────────────────────────────
const unsigned long READ_INTERVAL  = 5000;  // read + publish every 5s
const unsigned long STATUS_INTERVAL = 60000; // refresh MCU battery/status every 60s
const long          BLINK_NORMAL   = 1000;
const long          BLINK_ERROR    = 200;

unsigned long lastBlink  = 0;
unsigned long lastRead   = 0;
unsigned long lastStatus = 0;
bool          ledState  = false;
bool          dhtError  = false;
float         battPct   = 0;

// ── Clients ───────────────────────────────────────────────────────
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// PubSubClient only stores POINTERS to the will topic/payload,
// so they must live as globals.
char willTopic[256];
char willBuf[200];
char statusBuf[256];

// ── Forward declarations ──────────────────────────────────────────
void reportActuatorState(bool state);
void publishStatus(const char* status, const char* source);

// ── Battery ───────────────────────────────────────────────────────
float readBatteryVoltage() {
  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(BATTERY_PIN);
    delay(5);
  }
  float raw = sum / 10.0;
  return (raw / 4095.0) * 3.3 * 2.0;  // x2 for voltage divider
}

float batteryPercent(float voltage) {
  // 18650: 4.2V = 100%, 3.0V = 0%
  float pct = (voltage - 3.0) / (4.2 - 3.0) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

// ── Topics ────────────────────────────────────────────────────────
String baseTopic() {
  return String("irrigation/") + FARM_ID + "/" + FIELD_ID + "/" + MCU_ID;
}
String statusTopic()   { return baseTopic() + "/status"; }
String ackTopic()      { return baseTopic() + "/ack"; }
String sensorTopic()   { return baseTopic() + "/sensor/" + SENSOR_ID + "/data"; }
String actuatorTopic() { return baseTopic() + "/actuator/" + ACTUATOR_ID + "/state"; }

// ── Presence ──────────────────────────────────────────────────────
void publishStatus(const char* status, const char* source) {
  StaticJsonDocument<256> doc;
  doc["apiKey"]         = API_KEY;
  doc["status"]         = status;
  doc["source"]         = source;
  doc["batteryPercent"] = battPct;
  serializeJson(doc, statusBuf);

  String topic = statusTopic();
  bool ok = mqtt.publish(topic.c_str(), statusBuf, true); // retained
  Serial.printf("📡 Status %s (%s) → %s %s\n", status, source, topic.c_str(), ok ? "✅" : "❌ FAILED");
}

// ── Command acknowledgements ──────────────────────────────────────
// status: "delivered" | "executed" | "failed"
void publishAck(const char* commandId, const char* status, const char* message) {
  StaticJsonDocument<256> doc;
  doc["apiKey"]    = API_KEY;
  doc["commandId"] = commandId;
  doc["status"]    = status;
  if (strlen(message) > 0) doc["message"] = message;

  char buf[256];
  serializeJson(doc, buf);

  String topic = ackTopic();
  bool ok = mqtt.publish(topic.c_str(), buf);
  Serial.printf("📨 Ack %s → %s (%s) %s\n", commandId, status, message, ok ? "✅" : "❌ FAILED");
}

// Physically operate the actuator. Returns false when the actuator is
// unreachable or the action could not be completed (→ "failed" ack).
bool executeActuator(bool targetState) {
  // TODO(real hardware): drive the relay/pin and verify the actuator.
  Serial.println(targetState ? "🔓 OPEN (relay ON)" : "🔒 CLOSED (relay OFF)");
  return true;
}

// ── MQTT callback ─────────────────────────────────────────────────
void onMessage(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n📥 Message received!");
  Serial.println("   Topic: " + String(topic));

  // Config topics (actuators / sensors / schedules / ...) — retained
  // full-list snapshots; just log them.
  if (!String(topic).endsWith("/cmd")) {
    Serial.print("   ⚙️ Config payload: ");
    Serial.write(payload, length);
    Serial.println();
    return;
  }

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println("❌ JSON parse error: " + String(err.c_str()));
    return;
  }

  bool        targetState = doc["targetState"] | false;
  const char* commandId   = doc["commandId"] | "unknown";

  // 1) Confirm receipt → dashboard command becomes "delivered".
  publishAck(commandId, "delivered", "cmd_received");
  Serial.printf("   commandId: %s\n", commandId);

  // 2) Execute and report executed / failed back to the dashboard.
  if (executeActuator(targetState)) {
    publishAck(commandId, "executed", targetState ? "opened" : "closed");
    reportActuatorState(targetState);
  } else {
    publishAck(commandId, "failed", "actuator_unreachable");
  }
}

// ── Sensor publication ────────────────────────────────────────────
void sendSensorData(float temperature, float humidity,
                    int rawSoil, float soilPct,
                    float battVoltage, float battPctValue) {
  StaticJsonDocument<384> doc;
  doc["apiKey"]         = API_KEY;
  doc["sensorId"]       = SENSOR_ID;
  doc["value"]          = soilPct;
  doc["rawValue"]       = rawSoil;
  doc["unit"]           = "%";
  doc["timestamp"]      = millis();
  doc["batteryPercent"] = battPctValue;
  doc["batteryVoltage"] = battVoltage;
  // Extra context (ignored by the worker, useful for debugging)
  if (!dhtError) {
    doc["temperature"] = temperature;
    doc["humidity"]    = humidity;
  }

  char buf[384];
  serializeJson(doc, buf);

  String topic = sensorTopic();
  bool ok = mqtt.publish(topic.c_str(), buf);
  Serial.printf("💧 Soil %.1f%% (raw %d) | batt %.0f%% %.2fV — %s\n",
                soilPct, rawSoil, battPctValue, battVoltage, ok ? "✅" : "❌ FAILED");
}

// ── Actuator state publication ────────────────────────────────────
void reportActuatorState(bool state) {
  StaticJsonDocument<256> doc;
  doc["apiKey"]         = API_KEY;
  doc["state"]          = state;
  doc["batteryPercent"] = battPct;

  char buf[256];
  serializeJson(doc, buf);

  String topic = actuatorTopic();
  bool ok = mqtt.publish(topic.c_str(), buf);
  Serial.printf("🔁 Actuator state %s (batt %.0f%%) — %s\n",
                state ? "OPEN" : "CLOSED", battPct, ok ? "✅" : "❌ FAILED");
}

// ── Connections ───────────────────────────────────────────────────
void connectWifi() {
  Serial.print("📶 Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected — IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("🔌 Connecting to MQTT...");

    // LWT: broker publishes OFFLINE if we drop without a clean DISCONNECT.
    StaticJsonDocument<256> willDoc;
    willDoc["apiKey"] = API_KEY;
    willDoc["status"] = "OFFLINE";
    willDoc["source"] = "will";
    serializeJson(willDoc, willBuf);
    statusTopic().toCharArray(willTopic, sizeof(willTopic));

    if (mqtt.connect("esp32-ioseeds", MQTT_USER, MQTT_PASS,
                     willTopic, 1, true, willBuf)) {
      Serial.println(" ✅ Connected!");

      // Report ONLINE (overrides the retained will) with the current battery.
      publishStatus("ONLINE", "connect");

      String cmdTopic = baseTopic() + "/actuator/" + ACTUATOR_ID + "/cmd";
      mqtt.subscribe(cmdTopic.c_str(), 1);
      Serial.println("📡 Subscribed to: " + cmdTopic);

      String actuatorsTopic = baseTopic() + "/actuators";
      String sensorsTopic   = baseTopic() + "/sensors";
      mqtt.subscribe(actuatorsTopic.c_str(), 1);
      mqtt.subscribe(sensorsTopic.c_str(), 1);
      Serial.println("📡 Subscribed to: " + actuatorsTopic);
      Serial.println("📡 Subscribed to: " + sensorsTopic);

      // Publish the current actuator state once we are back online.
      reportActuatorState(false);
    } else {
      Serial.printf(" ❌ Failed rc=%d — retry in 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

// ── Setup ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  delay(1000);

  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_1,      OUTPUT);
  digitalWrite(LED_STATUS, LOW);
  digitalWrite(LED_1,      LOW);

  dht.begin();

  Serial.println("\n🌱 IOSeeds ESP32 starting...");
  Serial.println("DHT_PIN    : GPIO22");
  Serial.println("SOIL_PIN   : GPIO32");
  Serial.println("BATTERY_PIN: GPIO34");

  // Read the battery before connecting so the first ONLINE status carries it.
  battPct = batteryPercent(readBatteryVoltage());

  connectWifi();

  mqtt.setBufferSize(2048);
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

// ── Loop ──────────────────────────────────────────────────────────
void loop() {
  if (!mqtt.connected()) {
    // Broker also fires the LWT; the worker dedupes, so only the first
    // OFFLINE produces a log/notification.
    publishStatus("OFFLINE", "disconnect");
    connectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // ── Read real sensors + publish every READ_INTERVAL ─────────────
  if (now - lastRead >= READ_INTERVAL) {
    lastRead = now;

    // DHT11
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    dhtError          = isnan(temperature) || isnan(humidity);

    // Capacitive soil moisture
    int   rawSoil = analogRead(SOIL_PIN);
    float soilPct = map(rawSoil, 4095, 1500, 0, 100);
    soilPct       = constrain(soilPct, 0.0f, 100.0f);

    // Battery
    float battVoltage = readBatteryVoltage();
    battPct           = batteryPercent(battVoltage);
    bool  battLow     = battPct < 20.0;

    sendSensorData(temperature, humidity, rawSoil, soilPct, battVoltage, battPct);

    // Red LED = sensor error or low battery
    digitalWrite(LED_1, (dhtError || battLow) ? HIGH : LOW);

    Serial.println("------------------------------");
    if (dhtError) {
      Serial.println("DHT11 ERROR - check GPIO22 wiring");
    } else {
      Serial.printf("Temp %.1f C | Humidity %.1f %%\n", temperature, humidity);
    }
    Serial.printf("Soil raw %d | Soil %.1f %%\n", rawSoil, soilPct);
    Serial.printf("Battery %.2f V (%0.f %%)%s\n", battVoltage, battPct,
                  battLow ? "  ⚠️ LOW" : "");
    Serial.println("------------------------------\n");
  }

  // ── Periodic status/battery refresh (keeps MCU battery current) ─
  if (now - lastStatus >= STATUS_INTERVAL) {
    lastStatus = now;
    publishStatus("ONLINE", "status");
  }

  // ── Blue status LED blink (non-blocking) ────────────────────────
  long blinkInterval = dhtError ? BLINK_ERROR : BLINK_NORMAL;
  if (now - lastBlink >= (unsigned long)blinkInterval) {
    lastBlink = now;
    ledState  = !ledState;
    digitalWrite(LED_STATUS, ledState ? HIGH : LOW);
  }
}
