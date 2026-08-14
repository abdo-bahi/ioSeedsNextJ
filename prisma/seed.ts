import { auth } from "@/lib/auth"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"
import { authClient, signUp } from "@/lib/auth-client"

console.log("starting seeding .......")

const main = async () => {

  // ─── Wilayas ──────────────────────────────────────────────────
  await prisma.wilaya.createMany({
    data: [
      { code: "01", name: "Adrar" },
      { code: "02", name: "Chlef" },
      // ... all wilayas
      { code: "09", name: "Blida" },
      { code: "16", name: "Alger" },
    ],
    skipDuplicates: true,
  })
  console.log("✅ Wilayas seeded")

  // ─── Roles ────────────────────────────────────────────────────
  await prisma.role.createMany({
    data: [
      { name: "ADMIN" },
      { name: "OPERATOR" },
      { name: "FARMER" },
      { name: "VIEWER" },
    ],
    skipDuplicates: true,
  })
  console.log("✅ Roles seeded")

  // ─── Functionalities ──────────────────────────────────────────
  const allFunctionalities = [
    "users", "farms", "fields", "mcus",
    "sensors", "actuators", "schedules", "Parameters",
  ]

  await prisma.functionality.createMany({
    data: allFunctionalities.map(name => ({ name })),
    skipDuplicates: true,
  })
  console.log("✅ Functionalities seeded")

  // ─── Role functionalities ──────────────────────────────────────
  await prisma.role_Functionality.createMany({
    data: allFunctionalities.map(f => ({
      fk_role: "ADMIN", fk_functionality: f,
      canCreate: true, canRead: true, canUpdate: true, canDelete: true,
    })),
    skipDuplicates: true,
  })
  await prisma.role_Functionality.createMany({
    data: ["farms","fields","mcus","sensors","actuators","schedules"].map(f => ({
      fk_role: "FARMER", fk_functionality: f,
      canCreate: true, canRead: true, canUpdate: true, canDelete: true,
    })),
    skipDuplicates: true,
  })
  await prisma.role_Functionality.createMany({
    data: ["fields","mcus","sensors","actuators","schedules"].map(f => ({
      fk_role: "OPERATOR", fk_functionality: f,
      canCreate: true, canRead: true, canUpdate: true, canDelete: false,
    })),
    skipDuplicates: true,
  })
  await prisma.role_Functionality.createMany({
    data: allFunctionalities.map(f => ({
      fk_role: "VIEWER", fk_functionality: f,
      canCreate: false, canRead: true, canUpdate: false, canDelete: false,
    })),
    skipDuplicates: true,
  })
  console.log("✅ Role functionalities seeded")

  // ─── SensorTypes + ActuatorTypes ──────────────────────────────
  await prisma.sensorType.createMany({
    data: [
      { name: "soil_moisture", description: "Soil moisture sensor (%)" },
      { name: "temperature",   description: "Temperature sensor (°C)" },
      { name: "humidity",      description: "Air humidity sensor (%)" },
      { name: "flow_rate",     description: "Water flow rate (L/min)" },
    ],
    skipDuplicates: true,
  })
  await prisma.actuatorType.createMany({
    data: [
      { name: "drip_valve", description: "Drip irrigation valve" },
      { name: "sprinkler",  description: "Sprinkler head" },
      { name: "pump",       description: "Water pump" },
    ],
    skipDuplicates: true,
  })
  console.log("✅ SensorTypes + ActuatorTypes seeded")

  // ─── Admin user ────────────────────────────────────────────────
  const blida = await prisma.wilaya.findUnique({ where: { code: "09" } })
  const wilaya = await prisma.wilaya.findUnique({
    where: { code: "09" }
  })
    if (!blida) { console.error("❌ Blida not found"); return }

    const result = await auth.api.signUpEmail({
      body: {
        email: "admin@ioseeds.dz",
        password: "ioseed2026",
        name: "admin",
      }
    }).catch(e => {
      console.log('**** error : ', e);
    })
    console.log('**** result : ', result);
      
    let admin = await prisma.user.update(
      {
        where: {
          email:     "admin@ioseeds.dz",
        },
        data: {fk_wilaya: wilaya!.id},
      }
    )
    console.log("✅ Admin created:", admin.email);
  // ─── Farm ──────────────────────────────────────────────────────
  const farm = await prisma.farmingUnit.upsert({
    where: { fk_owner_name: { fk_owner: admin.id, name: "IOSeeds Farm" } },
    update: {},
    create: {
      name:        "IOSeeds Farm",
      address:     "Route de Blida, Blida",
      description: "Main test farm",
      isActive:    true,
      fk_wilaya:   blida.id,
      fk_owner:    admin.id,
    },
  })
  console.log("✅ Farm seeded:", farm.name)

  // ─── Fields ────────────────────────────────────────────────────
  // ✅ Create ALL fields first, THEN query them
  await prisma.irrigationField.upsert({
    where: { fk_FarmingUnit_name: { fk_FarmingUnit: farm.id, name: "Parcelle A" } },
    update: {},
    create: { name: "Parcelle A", latitude: 36.4703, longitude: 2.8277, isActive: true, fk_FarmingUnit: farm.id },
  })
  await prisma.irrigationField.upsert({
    where: { fk_FarmingUnit_name: { fk_FarmingUnit: farm.id, name: "Parcelle B" } },
    update: {},
    create: { name: "Parcelle B", latitude: 36.4710, longitude: 2.8290, isActive: true, fk_FarmingUnit: farm.id },
  })
  await prisma.irrigationField.upsert({
    where: { fk_FarmingUnit_name: { fk_FarmingUnit: farm.id, name: "Parcelle C" } },
    update: {},
    create: { name: "Parcelle C", latitude: 36.4720, longitude: 2.8310, isActive: false, fk_FarmingUnit: farm.id },
  })
  console.log("✅ Fields seeded: Parcelle A, B, C")

  // ─── Now safely fetch all three ───────────────────────────────
  // ✅ Outside the loop — all fields exist now
  const parcelleA = await prisma.irrigationField.findFirst({
    where: { name: "Parcelle A", fk_FarmingUnit: farm.id }
  })
  const parcelleB = await prisma.irrigationField.findFirst({
    where: { name: "Parcelle B", fk_FarmingUnit: farm.id }
  })
  const parcelleC = await prisma.irrigationField.findFirst({
    where: { name: "Parcelle C", fk_FarmingUnit: farm.id }
  })

  if (!parcelleA || !parcelleB || !parcelleC) {
    console.error("❌ Fields not found after seeding")
    return
  }

  // ─── MCUs ──────────────────────────────────────────────────────
  const mcuA = await prisma.mCU.upsert({
    where: { fk_irrigationField_name: { fk_irrigationField: parcelleA.id, name: "MCU-A1" } },
    update: {},
    create: {
      name: "MCU-A1", minSoilMoisture: 20, maxSoilMoisture: 80,
      sleepingTime: 30, macAddress: "AA:BB:CC:DD:EE:01",
      autoControlledIrrigation: true, isActive: true,
      apiKeyHash: "demo-api-key-hash-a1", status: "ONLINE",
      fk_irrigationField: parcelleA.id,
    },
  })
  const mcuB = await prisma.mCU.upsert({
    where: { fk_irrigationField_name: { fk_irrigationField: parcelleB.id, name: "MCU-B1" } },
    update: {},
    create: {
      name: "MCU-B1", minSoilMoisture: 25, maxSoilMoisture: 75,
      sleepingTime: 60, macAddress: "AA:BB:CC:DD:EE:02",
      autoControlledIrrigation: false, isActive: true,
      apiKeyHash: "demo-api-key-hash-b1", status: "SLEEPING",
      fk_irrigationField: parcelleB.id,
    },
  })
  const mcuC = await prisma.mCU.upsert({
    where: { fk_irrigationField_name: { fk_irrigationField: parcelleC.id, name: "MCU-C1" } },
    update: {},
    create: {
      name: "MCU-C1", minSoilMoisture: 15, maxSoilMoisture: 70,
      sleepingTime: 45, macAddress: "AA:BB:CC:DD:EE:03",
      autoControlledIrrigation: true, isActive: false,
      apiKeyHash: "demo-api-key-hash-c1", status: "OFFLINE",
      fk_irrigationField: parcelleC.id,
    },
  })
  console.log("✅ MCUs seeded")

  // ─── Sensors ───────────────────────────────────────────────────
  const sensorA1 = await prisma.sensor.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Sensor-A1-Moisture" } },
    update: {},
    create: {
      name: "Sensor-A1-Moisture", macAddress: "AA:BB:CC:DD:EE:11",
      latitude: 36.4703, longitude: 2.8277,
      minAnalogue: 0, maxAnalogue: 1023, isActive: true,
      fk_mcu: mcuA.id, fk_sensorType: "soil_moisture",
    },
  })
  await prisma.sensor.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Sensor-A1-Temp" } },
    update: {},
    create: {
      name: "Sensor-A1-Temp", macAddress: "AA:BB:CC:DD:EE:12",
      latitude: 36.4704, longitude: 2.8278,
      minAnalogue: 0, maxAnalogue: 1023, isActive: true,
      fk_mcu: mcuA.id, fk_sensorType: "temperature",
    },
  })
  await prisma.sensor.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuB.id, name: "Sensor-B1-Moisture" } },
    update: {},
    create: {
      name: "Sensor-B1-Moisture", macAddress: "AA:BB:CC:DD:EE:13",
      latitude: 36.4710, longitude: 2.8290,
      minAnalogue: 0, maxAnalogue: 1023, isActive: true,
      fk_mcu: mcuB.id, fk_sensorType: "soil_moisture",
    },
  })
  await prisma.sensor.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuC.id, name: "Sensor-C1-Moisture" } },
    update: {},
    create: {
      name: "Sensor-C1-Moisture", macAddress: "AA:BB:CC:DD:EE:14",
      latitude: 36.4720, longitude: 2.8310,
      minAnalogue: 0, maxAnalogue: 1023, isActive: true,
      fk_mcu: mcuC.id, fk_sensorType: "soil_moisture",
    },
  })
  console.log("✅ Sensors seeded")

  // ─── Actuators ─────────────────────────────────────────────────
  const actuatorA1 = await prisma.actuator.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Valve-A1" } },
    update: {},
    create: {
      name: "Valve-A1", macAddress: "AA:BB:CC:DD:EE:21",
      latitude: 36.4703, longitude: 2.8277,
      targetState: false, isActive: true,
      fk_mcu: mcuA.id, fk_actuatorType: "drip_valve",
    },
  })
  const actuatorB1 = await prisma.actuator.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuB.id, name: "Valve-B1" } },
    update: {},
    create: {
      name: "Valve-B1", macAddress: "AA:BB:CC:DD:EE:22",
      latitude: 36.4710, longitude: 2.8290,
      targetState: false, isActive: true,
      fk_mcu: mcuB.id, fk_actuatorType: "sprinkler",
    },
  })
  await prisma.actuator.upsert({
    where: { fk_mcu_name: { fk_mcu: mcuC.id, name: "Pump-C1" } },
    update: {},
    create: {
      name: "Pump-C1", macAddress: "AA:BB:CC:DD:EE:23",
      latitude: 36.4720, longitude: 2.8310,
      targetState: false, isActive: false,
      fk_mcu: mcuC.id, fk_actuatorType: "pump",
    },
  })
  console.log("✅ Actuators seeded")

  // ─── Actions ───────────────────────────────────────────────────
  const action1 = await prisma.actions.create({
    data: {
      actionVal: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      sentAt:    new Date(Date.now() - 1000 * 60 * 29),
      ackedAt:   new Date(Date.now() - 1000 * 60 * 28),
      fk_actuator: actuatorA1.id,
    },
  })
  const action2 = await prisma.actions.create({
    data: {
      actionVal: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
      sentAt:    new Date(Date.now() - 1000 * 60 * 9),
      ackedAt:   new Date(Date.now() - 1000 * 60 * 8),
      fk_actuator: actuatorA1.id,
    },
  })
  console.log("✅ Actions seeded")

  // ─── EnvironmentData ───────────────────────────────────────────
  const now = Date.now()
  const readings = [
    { value: 45.2, rawValue: 463, minutesAgo: 60 },
    { value: 48.5, rawValue: 497, minutesAgo: 50 },
    { value: 52.1, rawValue: 534, minutesAgo: 40 },
    { value: 68.3, rawValue: 699, minutesAgo: 30 },
    { value: 71.5, rawValue: 733, minutesAgo: 20 },
    { value: 70.2, rawValue: 719, minutesAgo: 10 },
    { value: 69.8, rawValue: 715, minutesAgo:  0 },
  ]
  for (const r of readings) {
    await prisma.environmentData.create({
      data: {
        value:     r.value,
        unit:      "%",
        rawValue:  r.rawValue,
        createdAt: new Date(now - r.minutesAgo * 60 * 1000),
        fk_sensor: sensorA1.id,
        fk_action: r.minutesAgo >= 30 ? action1.id : action2.id,
      },
    })
  }
  console.log("✅ EnvironmentData seeded")

  // ─── Schedules ─────────────────────────────────────────────────
  await prisma.schedule.upsert({
    where:  { id: "schedule-seed-1" },
    update: {},
    create: {
      id: "schedule-seed-1",
      name: "Arrosage matin — Parcelle A",
      repeatEveryDays: 1, duration: 1200, isActive: true,
      startAt:   new Date("2000-01-01T06:00:00"),
      startDate: new Date(),
      endDate:   new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      weekDays:  ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"],
      toggleAtThresholds: true,
      fk_actuator: actuatorA1.id,
    },
  })
  await prisma.schedule.upsert({
    where:  { id: "schedule-seed-2" },
    update: {},
    create: {
      id: "schedule-seed-2",
      name: "Arrosage soir — Parcelle B",
      repeatEveryDays: 2, duration: 2100, isActive: true,
      startAt:   new Date("2000-01-01T18:30:00"),
      startDate: new Date(),
      endDate:   new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      weekDays:  ["MONDAY","WEDNESDAY","FRIDAY","SUNDAY"],
      toggleAtThresholds: false,
      fk_actuator: actuatorB1.id,
    },
  })
  console.log("✅ Schedules seeded")

  // ─── RoleMember for admin on all fields ────────────────────────
  for (const field of [parcelleA, parcelleB, parcelleC]) {
    await prisma.roleMember.upsert({
      where: {
        fk_user_fk_role_fk_irrigationField: {
          fk_user:            admin.id,
          fk_role:            "ADMIN",
          fk_irrigationField: field.id,
        }
      },
      update: {},
      create: {
        fk_user:            admin.id,
        fk_role:            "ADMIN",
        fk_irrigationField: field.id,
      }
    })
  }
  console.log("✅ RoleMembers seeded for admin")
  console.log("🌱 Full seed complete!")
}

main()
  .catch(e => { console.error("❌ Seed error:", e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })