#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Config ────────────────────────────────────────────────────────
const char* WIFI_SSID = "abdo10s";
const char* WIFI_PASSWORD = "10011001";
const char* MQTT_BROKER = "192.168.100.9";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "admin";
const char* MQTT_PASS = "ioseeds2026";

// ── IOSeeds IDs ───────────────────────────────────────────────────
const char* FARM_ID = "cmsj9pj3i000vkcbisbbrib12";
const char* FIELD_ID = "cmsj9pj3s000wkcbixjdd70n3";
const char* MCU_ID = "cmsj9pj4s000zkcbiwo80bdas";
const char* SENSOR_ID = "cmsj9pj5l0012kcbi3k07j4f6";
const char* API_KEY = "e4eba5a852588f9a2ccb6f064d415945715fb7352d90d1e55c529480c142e958";

// ── Clients ───────────────────────────────────────────────────────
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastSend = 0;

// ─────────────────────────────────────────────────────────────────
void connectWifi() {
  Serial.print("📶 Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("✅ WiFi connected — IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("🔌 Connecting to MQTT...");

    if (mqtt.connect("esp32-ioseeds", MQTT_USER, MQTT_PASS)) {
      Serial.println(" ✅ Connected!");
    } else {
      Serial.printf(" ❌ Failed rc=%d — retry in 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

void sendSensorData() {
  float value = random(0, 1000) / 10.0;  // 0.0 – 100.0
  int rawValue = (int)(value * 10.23);

  StaticJsonDocument<256> doc;
  doc["apiKey"] = API_KEY;
  doc["sensorId"] = SENSOR_ID;
  doc["value"] = value;
  doc["rawValue"] = rawValue;
  doc["unit"] = "%";
  doc["timestamp"] = millis();

  char buf[512];
  serializeJson(doc, buf);

  String topic = String("irrigation/") + FARM_ID + "/" + FIELD_ID + "/" + MCU_ID
                 + "/sensor/" + SENSOR_ID + "/data";

  Serial.println("📤 Topic length: " + String(topic.length()));  
  Serial.println("📤 Topic: " + topic);      

  bool ok = mqtt.publish(topic.c_str(), buf);
  Serial.printf("💧 Sent: %.1f%% — %s\n", value, ok ? "✅" : "❌ FAILED");
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n🌱 IOSeeds ESP32 starting...");

  connectWifi();

  mqtt.setBufferSize(512);
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  if (millis() - lastSend > 5000) {
    lastSend = millis();
    sendSensorData();
  }
}