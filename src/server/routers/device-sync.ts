// src/server/routers/device-sync.ts
// Publishes the full actuator/sensor list of an MCU over MQTT (retained)
// whenever devices are created, updated or deleted — the MCU replaces
// its whole device list with the latest config on receipt.
import { prisma } from "../../../prisma/lib/prisma";
import { publishToMCU } from "@/lib/mqtt-publish";

type MCUContext = {
  farmId:  string;
  fieldId: string;
  mcuId:   string;
};

async function getMCUContext(mcuId: string): Promise<MCUContext | null> {
  const mcu = await prisma.mCU.findUnique({
    where: { id: mcuId },
    select: {
      id: true,
      fk_irrigationField: true,
      irrigationField: {
        select: { FarmingUnit: { select: { id: true } } },
      },
    },
  });

  if (!mcu || !mcu.irrigationField) return null;

  return {
    farmId:  mcu.irrigationField.FarmingUnit!.id,
    fieldId: mcu.fk_irrigationField,
    mcuId:   mcu.id,
  };
}

// ── Actuators ───────────────────────────────────────────────────────
export async function syncActuatorsToMCU(mcuId: string) {
  const ctx = await getMCUContext(mcuId);
  if (!ctx) return;

  const actuators = await prisma.actuator.findMany({
    where: { fk_mcu: mcuId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      targetState: true,
      toggleTimeLimit: true,
      isActive: true,
      fk_actuatorType: true,
      actuatorType: { select: { name: true, isForIrrigation: true } },
    },
  });

  await publishToMCU(
    `irrigation/${ctx.farmId}/${ctx.fieldId}/${ctx.mcuId}/actuators`,
    {
      commandId: `actuators-${Date.now()}`,
      actuators: actuators.map((a) => ({
        id:           a.id,
        name:         a.name,
        targetState:  a.targetState,
        toggleTimeLimit: a.toggleTimeLimit,
        isActive:     a.isActive,
        actuatorType: a.actuatorType?.name ?? null,
        isForIrrigation: a.actuatorType?.isForIrrigation === true,
      })),
    },
    { retain: true }
  );

  console.log(`📤 Synced ${actuators.length} actuators to MCU ${mcuId}`);
}

// ── Sensors ─────────────────────────────────────────────────────────
export async function syncSensorsToMCU(mcuId: string) {
  const ctx = await getMCUContext(mcuId);
  if (!ctx) return;

  const sensors = await prisma.sensor.findMany({
    where: { fk_mcu: mcuId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      isActive: true,
      fk_sensorType: true,
      minAnalogue: true,
      maxAnalogue: true,
      rowValueConversion: true,
    },
  });

  await publishToMCU(
    `irrigation/${ctx.farmId}/${ctx.fieldId}/${ctx.mcuId}/sensors`,
    {
      commandId: `sensors-${Date.now()}`,
      sensors: sensors.map((s) => ({
        id:                 s.id,
        name:               s.name,
        unit:               s.unit,
        isActive:           s.isActive,
        sensorType:         s.fk_sensorType,
        minAnalogue:        s.minAnalogue,
        maxAnalogue:        s.maxAnalogue,
        rowValueConversion: s.rowValueConversion,
      })),
    },
    { retain: true }
  );

  console.log(`📤 Synced ${sensors.length} sensors to MCU ${mcuId}`);
}