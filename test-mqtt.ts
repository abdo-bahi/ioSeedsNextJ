// test-mqtt.ts
import mqtt from "mqtt";
import * as dotenv from "dotenv";
dotenv.config();

console.log(
  "Connecting to:",
  process.env.MQTT_BROKER_URL,
  "with : \nuser",
  process.env.MQTT_USER,
  "\npassword",
  process.env.MQTT_PASSWORD
);

const client = mqtt.connect(process.env.MQTT_BROKER_URL!, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
  clientId: "test-client",
});

client.on("connect", () => {
  console.log("✅ Connected!");
  client.subscribe("irrigation/#", { qos: 1 }, (err) => {
    if (err) console.error("Subscribe error:", err);
    else console.log("📡 Subscribed to irrigation/#");
  });
});

client.on("message", (topic, payload) => {
  console.log("📨 Message:", topic, payload.toString());
});

client.on("error", (err) => console.error("❌ Error:", err));
client.on("offline", () => console.log("⚠️  Offline"));
client.on("reconnect", () => console.log("🔄 Reconnecting..."));
