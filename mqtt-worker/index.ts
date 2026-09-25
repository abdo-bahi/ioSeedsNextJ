import mqtt from "mqtt";
import crypto from "crypto";
import * as dotenv from "dotenv";
import path from "path";
// Load .env manually from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { MCU, MCUStatus } from "../generated/prisma/client";
import { notify } from "../src/lib/notifications";

import http from "http";

interface MQTTData {
  value?:      string | number
  rawValue?:   string | number
  unit?:       string
  state?:      string | boolean
  status?:     string
  apiKey?:     string
  commandId?:  string
  success?:    boolean
  message?:    string
}

// ── Simple HTTP server for receiving publish commands ──────────────
const httpServer = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end();
    return;
  }

  // Auth check
  const workerKey = req.headers["x-worker-key"];
  if (workerKey !== process.env.WORKER_SECRET) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // Parse body
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    try {
      const { topic, payload, retain } = JSON.parse(body);
      client.publish(topic, JSON.stringify(payload), {
        qos: 2,
        retain: retain === true, // keep the latest state on the broker
      });
      console.log(`📤 Published to ${topic}${retain === true ? " (retained)" : ""}`);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Failed" }));
    }
  });
});

httpServer.listen(3001, () => {
  console.log("📡 Worker HTTP server on port 3001");
});

// ✅ Create directly here — not from prisma/lib/prisma.ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const client = mqtt.connect(process.env.MQTT_BROKER_URL!, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
  clientId: "irrigation-worker",
  reconnectPeriod: 3000,
  clean: true,
});

// ── Validate MCU API key ───────────────────────────────────────────
async function validateMCU(mcuId: string, fieldId: string, rawApiKey: string) {
  const apiKeyHash = crypto
    .createHash("sha256")
    .update(rawApiKey)
    .digest("hex");

  return await prisma.mCU.findFirst({
    where: {
      id: mcuId,
      apiKeyHash,
      isActive: true,
      fk_irrigationField: fieldId,
    },
  });
}

// ── SSE broadcast ──────────────────────────────────────────────────
async function broadcast(event: string, data: unknown) {
  console.log("📡 worker broadcast CALLED")

  try {
    await fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/sse/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-key": process.env.WORKER_SECRET ?? "",
      },
      body: JSON.stringify({ event, data }),
    });
  } catch(error) {
    console.error("❌ SSE broadcast failed:", error)
  }
}

// ── Subscribe ──────────────────────────────────────────────────────
client.on("connect", () => {
  console.log("✅ MQTT Worker connected");

  const topics = [
    "irrigation/+/+/+/sensor/+/data", // sensor readings
    "irrigation/+/+/+/actuator/+/state", // actuator state reports
    "irrigation/+/+/+/status", // MCU online/offline fecheck
    "irrigation/+/+/+/ack", // command acknowledgements
  ];

  client.subscribe(topics, { qos: 1 }, (err) => {
    if (err) console.error("Subscribe error:", err);
    else console.log("📡 Subscribed to:", topics);
  });
});

// ── Route messages ─────────────────────────────────────────────────
client.on("message", async (topic, payload) => {
  try {
    const parts = topic.split("/");
    // irrigation / farmId / fieldId / mcuId / ...rest
    const [, , fieldId, mcuId] = parts;
    const data = JSON.parse(payload.toString());

    // Validate MCU
    const mcu = await validateMCU(mcuId, fieldId, data.apiKey ?? "");
    if (!mcu) {
      console.warn(`⚠️  Rejected message — invalid apiKey for mcuId=${mcuId}`);
      return;
    }

    // Route by topic pattern
    if (parts[4] === "sensor" && parts[6] === "data") {
      await handleSensorData(mcu, parts[5], data);
    } else if (parts[4] === "actuator" && parts[6] === "state") {
      await handleActuatorState(mcu, parts[5], data);
    } else if (parts[4] === "status") {
      await handleMCUStatus(mcu, data);
    } else if (parts[4] === "ack") {
      await handleAck(mcu, data);
    }
  } catch (err) {
    console.error("Message error:", err, "topic:", topic);
  }
});

// ── 1. Sensor data handler ─────────────────────────────────────────
async function handleSensorData(mcu: MCU, sensorId: string, data: MQTTData) {
  console.log(`🌱 Sensor ${sensorId}: ${data.value}${data.rawValue}`);

  // Verify sensor belongs to this MCU
  const sensor = await prisma.sensor.findFirst({
    where: { id: sensorId, fk_mcu: mcu.id, isActive: true },
  });

  if (!sensor) {
    console.warn(`⚠️  Sensor ${sensorId} not found or inactive`);
    return;
  }

  // Save reading
  await prisma.environmentData.create({
    data: {
      value: parseFloat(String(data.value)),
      rawValue: data.rawValue != null ? parseFloat(String(data.rawValue)) : null,
      fk_sensor: sensor.id,
      fk_action: null,
    },
  });

  // Broadcast to dashboard 
  await broadcast("sensor_reading", {
    mcuId:      mcu.id,
    sensorId:   sensor.id,
    sensorType: sensor.fk_sensorType,
    fieldId:    mcu.fk_irrigationField,
    value:      data.value,
    timestamp:  new Date().toISOString(),
  })

  console.log(`✅ Reading saved: ${sensor.name} = ${data.value}${data.unit}`);

  // Check thresholds
  const thresholds = await prisma.threshold.findMany({
    where: { fk_sensor: sensor.id, isActive: true },
  });

  if (thresholds.length) {
    const value = parseFloat(String(data.value));
    for (const t of thresholds) {
      if (t.minValue !== null && value < t.minValue) {
        await notify(
          {
            type:        "MIN_THRESHOLD",
            title:       "⚠️ Seuil min atteint",
            message:     `${sensor.name} = ${data.value}${data.unit ?? ""} (seuil: ${t.minValue})`,
            fk_sensor:   sensor.id,
            fk_actuator: t.fk_actuator,
            fieldId:     mcu.fk_irrigationField,
          },
          (d) => broadcast("notification", d)
        );
      }

      if (t.maxValue !== null && value > t.maxValue) {
        await notify(
          {
            type:        "MAX_THRESHOLD",
            title:       "⚠️ Seuil max atteint",
            message:     `${sensor.name} = ${data.value}${data.unit ?? ""} (seuil: ${t.maxValue})`,
            fk_sensor:   sensor.id,
            fk_actuator: t.fk_actuator,
            fieldId:     mcu.fk_irrigationField,
          },
          (d) => broadcast("notification", d)
        );
      }
    }
  }
}

// ── 2. Actuator state handler ──────────────────────────────────────
async function handleActuatorState(mcu: MCU, actuatorId: string, data: MQTTData) {
  console.log(`⚡ Actuator ${actuatorId}: state=${data.state}`);

  // Verify actuator belongs to this MCU
  const actuator = await prisma.actuator.findFirst({
    where: { id: actuatorId, fk_mcu: mcu.id },
  });

  if (!actuator) {
    console.warn(`⚠️  Actuator ${actuatorId} not found on MCU ${mcu.name}`);
    return;
  }

  const newState = data.state === true || data.state === "true";

  // Update targetState optimistically — opening always restarts the countdown
  await prisma.actuator.update({
    where: { id: actuatorId },
    data: {
      targetState:     newState,
      toggleStartedAt: newState ? new Date() : null,
    },
  });

  if (actuator.targetState !== newState) {
    // Create action record
    await prisma.actions.create({
      data: {
        actionVal: newState,
        sentAt: new Date(),
        fk_actuator: actuatorId,
        mcuAction: true,
        fk_user:     null,         
      },
    });

    await notify(
      {
        type:        "ACTUATOR_AUTO",
        title:       "🤖 Action automatique",
        message:     `${actuator.name} ${newState ? "ouvert" : "fermé"} par le MCU`,
        fk_actuator: actuatorId,
        fieldId:     mcu.fk_irrigationField,
      },
      (d) => broadcast("notification", d)
    );
  }

  // Broadcast to dashboard
  await broadcast("actuator_state", {
    mcuId: mcu.id,
    actuatorId: actuator.id,
    name: actuator.name,
    state: newState,
    fieldId: mcu.fk_irrigationField,
    timestamp: new Date().toISOString(),
  });

  console.log(`✅ Actuator ${actuator.name} state updated: ${data.state}`);
}

// ── 3. MCU status handler ──────────────────────────────────────────
async function handleMCUStatus(mcu: MCU, data: MQTTData) {
  const status = (data.status as string)?.toUpperCase() ?? "OFFLINE";

  await prisma.mCU.update({
    where: { id: mcu.id },
    data: { status: status as MCUStatus },
  });

  await broadcast("device_status", {
    mcuId: mcu.id,
    name: mcu.name,
    fieldId: mcu.fk_irrigationField,
    status,
  });

  if (status === "OFFLINE") {
    await notify(
      {
        type:    "MCU_INACTIVE",
        title:   "📡 MCU hors ligne",
        message: `${mcu.name} est passé hors ligne`,
        fk_mcu:  mcu.id,
        fieldId: mcu.fk_irrigationField,
      },
      (d) => broadcast("notification", d)
    );
  }

  console.log(`📡 MCU ${mcu.name} → ${status}`);
}

// ── 4. Ack handler ─────────────────────────────────────────────────
async function handleAck(mcu: MCU, data: MQTTData) {
  if (!data.commandId) return;

  await prisma.actions.update({
    where: { id: data.commandId },
    data: { ackedAt: new Date() },
  });

  await broadcast("command_ack", {
    mcuId: mcu.id,
    commandId: data.commandId,
    success: data.success,
    message: data.message,
  });

  console.log(`✅ Ack: commandId=${data.commandId} success=${data.success}`);
}

// ── Publish helpers (called from Next.js via HTTP or direct import) ─

// Send actuator command to device
export function publishActuatorCommand(
  farmId: string,
  fieldId: string,
  mcuId: string,
  actuatorId: string,
  commandId: string,
  targetState: boolean
) {
  const topic = `irrigation/${farmId}/${fieldId}/${mcuId}/actuator/${actuatorId}/cmd`;
  const payload = JSON.stringify({ commandId, actuatorId, targetState });
  // Retained: broker keeps the last state → a reconnecting MCU instantly
  // receives the current command when it (re)subscribes.
  client.publish(topic, payload, { qos: 1, retain: true });
  console.log(`📤 Actuator cmd → ${actuatorId}: state=${targetState} (retained)`);
}

// Send config update to MCU
export function publishMCUConfig(
  farmId: string,
  fieldId: string,
  mcuId: string,
  commandId: string,
  config: {
    sleepingTime?: number;
    minSoilMoisture?: number;
    maxSoilMoisture?: number;
    autoControlledIrrigation?: boolean;
  }
) {
  const topic = `irrigation/${farmId}/${fieldId}/${mcuId}/config`;
  const payload = JSON.stringify({ commandId, ...config });
  client.publish(topic, payload, { qos: 1, retain: true });
  console.log(`📤 Config → MCU ${mcuId}:`, config, "(retained)");
}

// ── Graceful shutdown ──────────────────────────────────────────────
process.on("SIGINT", () => {
  client.end();
  prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", () => {
  client.end();
  prisma.$disconnect();
  process.exit(0);
});

console.log("🌱 MQTT Worker starting...");
