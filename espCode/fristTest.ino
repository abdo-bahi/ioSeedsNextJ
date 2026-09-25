#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Config ────────────────────────────────────────────────────────
const char* WIFI_SSID = "IdoomFibre_Bh";
const char* WIFI_PASSWORD = "********";
const char* MQTT_BROKER = "192.168.100.9";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "admin";
const char* MQTT_PASS = "ioseeds2026";

// ── IOSeeds IDs ───────────────────────────────────────────────────
const char* FARM_ID = "cmsj9pj3i000vkcbisbbrib12";
const char* FIELD_ID = "cmsj9pj3s000wkcbixjdd70n3";
const char* MCU_ID = "cmsj9pj4s000zkcbiwo80bdas";
const char* SENSOR_ID = "cmsj9pj5l0012kcbi3k07j4f6";
const char* ACTUATOR_ID = "cmsj9pj700016kcbiw7yjbtak";
const char* API_KEY = "e4eba5a852588f9a2ccb6f064d415945715fb7352d90d1e55c529480c142e958";

// ── Clients ───────────────────────────────────────────────────────
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastSend = 0;

// -- callback for mqtt subscriber ----------------------
void onMessage(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n📥 Message received!");
  Serial.println("   Topic: " + String(topic));

  // Config topics (actuators / sensors / schedules / ...) — retained
  // full-list snapshots; just log them (the MCU replaces its whole list).
  if (!String(topic).endsWith("/cmd")) {
    Serial.print("   ⚙️ Config payload: ");
    Serial.write(payload, length);
    Serial.println();
    return;
  }

  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);

  if (err) {
    Serial.println("❌ JSON parse error: " + String(err.c_str()));
    return;
  }
  // ── Actuator command ──────────────────────────────────────────
  bool targetState = doc["targetState"] | false;
  const char* commandId = doc["commandId"] | "unknown";

  if (targetState) {
    Serial.println("🔓 OPEN");
  } else {
    Serial.println("🔒 CLOSED");
  }

  Serial.printf("   commandId: %s\n", commandId);

  // Apply the state (live command OR retained message pushed right after
  // subscribe) and confirm it back to the dashboard.
  reportActuatorState(targetState);
  }
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
       // Subscribe to actuator command topic.
       // Because the server publishes with { retain: true }, Mosquitto
       // instantly pushes the latest retained command to us here.
      String cmdTopic = String("irrigation/") + FARM_ID + "/" + FIELD_ID
                      + "/" + MCU_ID + "/actuator/" + ACTUATOR_ID + "/cmd";

      mqtt.subscribe(cmdTopic.c_str(), 1);
      Serial.println("📡 Subscribed to: " + cmdTopic);

       // Device config topics — server publishes the full actuator/sensor
       // lists on create/update/delete (retained → delivered on boot).
      String actuatorsTopic = String("irrigation/") + FARM_ID + "/" + FIELD_ID
                              + "/" + MCU_ID + "/actuators";
      String sensorsTopic = String("irrigation/") + FARM_ID + "/" + FIELD_ID
                              + "/" + MCU_ID + "/sensors";
      mqtt.subscribe(actuatorsTopic.c_str(), 1);
      mqtt.subscribe(sensorsTopic.c_str(), 1);
      Serial.println("📡 Subscribed to: " + actuatorsTopic);
      Serial.println("📡 Subscribed to: " + sensorsTopic);

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

void reportActuatorState(bool state) {
  StaticJsonDocument<256> doc;
  doc["apiKey"] = API_KEY;
  doc["state"] = state;

  char buf[256];
  serializeJson(doc, buf);

  String topic = String("irrigation/") + FARM_ID + "/" + FIELD_ID + "/" + MCU_ID
                 + "/actuator/" + ACTUATOR_ID + "/state";

  bool ok = mqtt.publish(topic.c_str(), buf);
  Serial.printf("🔁 Actuator state reported: %s — %s\n", state ? "OPEN" : "CLOSED", ok ? "✅" : "❌ FAILED");
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n🌱 IOSeeds ESP32 starting...");

  connectWifi();

  mqtt.setBufferSize(2048);
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage); 
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  if (millis() - lastSend > 5000) {
    lastSend = millis();
    sendSensorData();
  }
}