import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";


console.log("starting seeding .......");

const main = async () => {
  //Seeding wilayas
  await prisma.wilaya.createMany({
    data: [
      { code: "01", name: "Adrar" },
      { code: "02", name: "Chlef" },
      { code: "03", name: "Laghouat" },
      { code: "04", name: "Oum El Bouaghi" },
      { code: "05", name: "Batna" },
      { code: "06", name: "Béjaïa" },
      { code: "07", name: "Biskra" },
      { code: "08", name: "Béchar" },
      { code: "09", name: "Blida" },
      { code: "10", name: "Bouira" },
      { code: "11", name: "Tamanrasset" },
      { code: "12", name: "Tébessa" },
      { code: "13", name: "Tlemcen" },
      { code: "14", name: "Tiaret" },
      { code: "15", name: "Tizi Ouzou" },
      { code: "16", name: "Alger" },
      { code: "17", name: "Djelfa" },
      { code: "18", name: "Jijel" },
      { code: "19", name: "Sétif" },
      { code: "20", name: "Saïda" },
      { code: "21", name: "Skikda" },
      { code: "22", name: "Sidi Bel Abbès" },
      { code: "23", name: "Annaba" },
      { code: "24", name: "Guelma" },
      { code: "25", name: "Constantine" },
      { code: "26", name: "Médéa" },
      { code: "27", name: "Mostaganem" },
      { code: "28", name: "M'Sila" },
      { code: "29", name: "Mascara" },
      { code: "30", name: "Ouargla" },
      { code: "31", name: "Oran" },
      { code: "32", name: "El Bayadh" },
      { code: "33", name: "Illizi" },
      { code: "34", name: "Bordj Bou Arréridj" },
      { code: "35", name: "Boumerdès" },
      { code: "36", name: "El Tarf" },
      { code: "37", name: "Tindouf" },
      { code: "38", name: "Tissemsilt" },
      { code: "39", name: "El Oued" },
      { code: "40", name: "Khenchela" },
      { code: "41", name: "Souk Ahras" },
      { code: "42", name: "Tipaza" },
      { code: "43", name: "Mila" },
      { code: "44", name: "Aïn Defla" },
      { code: "45", name: "Naâma" },
      { code: "46", name: "Aïn Témouchent" },
      { code: "47", name: "Ghardaïa" },
      { code: "48", name: "Relizane" },

      // New wilayas (since 2019)
      { code: "49", name: "Timimoun" },
      { code: "50", name: "Bordj Badji Mokhtar" },
      { code: "51", name: "Ouled Djellal" },
      { code: "52", name: "Béni Abbès" },
      { code: "53", name: "In Salah" },
      { code: "54", name: "In Guezzam" },
      { code: "55", name: "Touggourt" },
      { code: "56", name: "Djanet" },
      { code: "57", name: "El M'Ghair" },
      { code: "58", name: "El Meniaa" },
      // New wilayas (2025)
      { code: "59", name: "Aflou" },
      { code: "60", name: "Barika" },
      { code: "61", name: "El Kantara" },
      { code: "62", name: "Bir El Ater" },
      { code: "63", name: "El Aricha" },
      { code: "64", name: "Ksar Chellala" },
      { code: "65", name: "Aïn Ouessara" },
      { code: "66", name: "Messaad" },
      { code: "67", name: "Ksar El Boukhari" },
      { code: "68", name: "Bou Saâda" },
      { code: "69", name: "El Abiodh Sidi Cheikh" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Wilayas seeded");

  // ─── Roles ──────────────────────────────────────────────────
  await prisma.role.createMany({
    data: [
      { name: "ADMIN" },
      { name: "OPERATOR" },
      { name: "FARMER" },
      { name: "VIEWER" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Roles seeded");

    // ─── Role Functionalities ────────────────────────────────────
    const allFunctionalities = [
      "users",
      "farms",
      "fields",
      "mcus",
      "sensors",
      "actuators",
      "schedules",
      "Parameters",
    ];

  // ─── Functionalities ─────────────────────────────────────────
  await prisma.functionality.createMany({
    data: [
      { name: "users" },
      { name: "farms" },
      { name: "fields" },
      { name: "mcus" },
      { name: "sensors" },
      { name: "actuators" },
      { name: "schedules" },
      { name: "Parameters" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Functionalities seeded");



  // ADMIN — full access
  await prisma.role_Functionality.createMany({
    data: allFunctionalities.map((f) => ({
      fk_role: "ADMIN",
      fk_functionality: f,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    })),
    skipDuplicates: true,
  });

  // FARMER — can manage their own farm, no users
  await prisma.role_Functionality.createMany({
    data: ["farms", "fields", "mcus", "sensors", "actuators", "schedules"].map(
      (f) => ({
        fk_role: "FARMER",
        fk_functionality: f,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      })
    ),
    skipDuplicates: true,
  });

  // OPERATOR — can read and update, no delete
  await prisma.role_Functionality.createMany({
    data: ["fields", "mcus", "sensors", "actuators", "schedules"].map((f) => ({
      fk_role: "OPERATOR",
      fk_functionality: f,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    })),
    skipDuplicates: true,
  });

  // VIEWER — read only
  await prisma.role_Functionality.createMany({
    data: allFunctionalities.map((f) => ({
      fk_role: "VIEWER",
      fk_functionality: f,
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    })),
    skipDuplicates: true,
  });

  console.log("✅ Role functionalities seeded");

  // ─── Admin User ──────────────────────────────────────────────
  const wilaya = await prisma.wilaya.findUnique({
    where: { code: "09" }
  })
  const hash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.upsert(
    {
      where: {
        email:     "adminn@ioseeds.dz",
      },
      update: {},
      create: {
        name:      "admin",
        email:     "adminn@ioseeds.dz",
        hash:      hash,
        fk_wilaya: wilaya!.id,  
      },
    }
  )
  console.log("✅ User Admin seeded");


if (!admin) {
  console.error("❌ Admin user not found — run full seed first")
  return
}

// ─── Get Blida wilaya ─────────────────────────────────────────────
const blida = await prisma.wilaya.findUnique({
  where: { code: "09" }
})

if (!blida) {
  console.error("❌ Blida wilaya not found — run full seed first")
  return
}

// ─── Seed Farm ────────────────────────────────────────────────────
const farm = await prisma.farmingUnit.upsert({
  where: {
    fk_owner_name: {
      fk_owner: admin.id,
      name:     "IOSeeds Farm",
    }
  },
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

console.log("✅ Farm seeded:", farm.name, "→", farm.id)

// ─── Seed 3 Irrigation Fields ─────────────────────────────────────
const fieldData = [
  {
    name:           "Parcelle A",
    latitude:       36.4703,
    longitude:      2.8277,
    isActive:       true,
    fk_FarmingUnit: farm.id,
  },
  {
    name:           "Parcelle B",
    latitude:       36.4710,
    longitude:      2.8290,
    isActive:       true,
    fk_FarmingUnit: farm.id,
  },
  {
    name:           "Parcelle C",
    latitude:       36.4720,
    longitude:      2.8310,
    isActive:       false,
    fk_FarmingUnit: farm.id,
  },
]

for (const field of fieldData) {
  await prisma.irrigationField.upsert({
    where: {
      fk_FarmingUnit_name: {
        fk_FarmingUnit: farm.id,
        name:           field.name,
      }
    },
    update: {},
    create: field,
  })
  console.log("✅ Field seeded:", field.name)

  // ─── SensorTypes ──────────────────────────────────────────────────
await prisma.sensorType.createMany({
  data: [
    { name: "soil_moisture",  description: "Soil moisture sensor (%)" },
    { name: "temperature",    description: "Temperature sensor (°C)" },
    { name: "humidity",       description: "Air humidity sensor (%)" },
    { name: "flow_rate",      description: "Water flow rate (L/min)" },
  ],
  skipDuplicates: true,
})
console.log("✅ SensorTypes seeded")

// ─── ActuatorTypes ────────────────────────────────────────────────
await prisma.actuatorType.createMany({
  data: [
    { name: "drip_valve",   description: "Drip irrigation valve" },
    { name: "sprinkler",    description: "Sprinkler head" },
    { name: "pump",         description: "Water pump" },
  ],
  skipDuplicates: true,
})
console.log("✅ ActuatorTypes seeded")

// ─── Get fields we just seeded ────────────────────────────────────
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
  console.error("❌ Fields not found — run field seed first")
  return
}

// ─── MCUs ─────────────────────────────────────────────────────────
const mcuA = await prisma.mCU.upsert({
  where: {
    fk_irrigationField_name: {
      fk_irrigationField: parcelleA.id,
      name: "MCU-A1",
    }
  },
  update: {},
  create: {
    name:                     "MCU-A1",
    minSoilMoisture:          20,
    maxSoilMoisture:          80,
    sleepingTime:             30,
    macAddress:               "AA:BB:CC:DD:EE:01",
    autoControlledIrrigation: true,
    isActive:                 true,
    apiKeyHash:               "demo-api-key-hash-a1",
    status:                   "ONLINE",
    fk_irrigationField:       parcelleA.id,
  },
})

const mcuB = await prisma.mCU.upsert({
  where: {
    fk_irrigationField_name: {
      fk_irrigationField: parcelleB.id,
      name: "MCU-B1",
    }
  },
  update: {},
  create: {
    name:                     "MCU-B1",
    minSoilMoisture:          25,
    maxSoilMoisture:          75,
    sleepingTime:             60,
    macAddress:               "AA:BB:CC:DD:EE:02",
    autoControlledIrrigation: false,
    isActive:                 true,
    apiKeyHash:               "demo-api-key-hash-b1",
    status:                   "SLEEPING",
    fk_irrigationField:       parcelleB.id,
  },
})

const mcuC = await prisma.mCU.upsert({
  where: {
    fk_irrigationField_name: {
      fk_irrigationField: parcelleC.id,
      name: "MCU-C1",
    }
  },
  update: {},
  create: {
    name:                     "MCU-C1",
    minSoilMoisture:          15,
    maxSoilMoisture:          70,
    sleepingTime:             45,
    macAddress:               "AA:BB:CC:DD:EE:03",
    autoControlledIrrigation: true,
    isActive:                 false,
    apiKeyHash:               "demo-api-key-hash-c1",
    status:                   "OFFLINE",
    fk_irrigationField:       parcelleC.id,
  },
})

console.log("✅ MCUs seeded: MCU-A1, MCU-B1, MCU-C1")

// ─── Sensors ──────────────────────────────────────────────────────
const sensorA1 = await prisma.sensor.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Sensor-A1-Moisture" } },
  update: {},
  create: {
    name:          "Sensor-A1-Moisture",
    macAddress:    "AA:BB:CC:DD:EE:11",
    latitude:      36.4703,
    longitude:     2.8277,
    minAnalogue:   0,
    maxAnalogue:   1023,
    isActive:      true,
    fk_mcu:        mcuA.id,
    fk_sensorType: "soil_moisture",
  },
})

const sensorA2 = await prisma.sensor.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Sensor-A1-Temp" } },
  update: {},
  create: {
    name:          "Sensor-A1-Temp",
    macAddress:    "AA:BB:CC:DD:EE:12",
    latitude:      36.4704,
    longitude:     2.8278,
    minAnalogue:   0,
    maxAnalogue:   1023,
    isActive:      true,
    fk_mcu:        mcuA.id,
    fk_sensorType: "temperature",
  },
})

const sensorB1 = await prisma.sensor.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuB.id, name: "Sensor-B1-Moisture" } },
  update: {},
  create: {
    name:          "Sensor-B1-Moisture",
    macAddress:    "AA:BB:CC:DD:EE:13",
    latitude:      36.4710,
    longitude:     2.8290,
    minAnalogue:   0,
    maxAnalogue:   1023,
    isActive:      true,
    fk_mcu:        mcuB.id,
    fk_sensorType: "soil_moisture",
  },
})

const sensorC1 = await prisma.sensor.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuC.id, name: "Sensor-C1-Moisture" } },
  update: {},
  create: {
    name:          "Sensor-C1-Moisture",
    macAddress:    "AA:BB:CC:DD:EE:14",
    latitude:      36.4720,
    longitude:     2.8310,
    minAnalogue:   0,
    maxAnalogue:   1023,
    isActive:      true,
    fk_mcu:        mcuC.id,
    fk_sensorType: "soil_moisture",
  },
})

console.log("✅ Sensors seeded")

// ─── Actuators ────────────────────────────────────────────────────
const actuatorA1 = await prisma.actuator.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuA.id, name: "Valve-A1" } },
  update: {},
  create: {
    name:            "Valve-A1",
    macAddress:      "AA:BB:CC:DD:EE:21",
    latitude:        36.4703,
    longitude:       2.8277,
    targetState:     false,
    isActive:        true,
    fk_mcu:          mcuA.id,
    fk_actuatorType: "drip_valve",
  },
})

const actuatorB1 = await prisma.actuator.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuB.id, name: "Valve-B1" } },
  update: {},
  create: {
    name:            "Valve-B1",
    macAddress:      "AA:BB:CC:DD:EE:22",
    latitude:        36.4710,
    longitude:       2.8290,
    targetState:     false,
    isActive:        true,
    fk_mcu:          mcuB.id,
    fk_actuatorType: "sprinkler",
  },
})

const actuatorC1 = await prisma.actuator.upsert({
  where: { fk_mcu_name: { fk_mcu: mcuC.id, name: "Pump-C1" } },
  update: {},
  create: {
    name:            "Pump-C1",
    macAddress:      "AA:BB:CC:DD:EE:23",
    latitude:        36.4720,
    longitude:       2.8310,
    targetState:     false,
    isActive:        false,
    fk_mcu:          mcuC.id,
    fk_actuatorType: "pump",
  },
})

console.log("✅ Actuators seeded")

// ─── Actions + EnvironmentData ────────────────────────────────────
// Need an action first before environment data (FK constraint)

const action1 = await prisma.actions.create({
  data: {
    actionVal:   true,
    createdAt:   new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    sentAt:      new Date(Date.now() - 1000 * 60 * 29),
    ackedAt:     new Date(Date.now() - 1000 * 60 * 28),
    fk_actuator: actuatorA1.id,
  },
})

const action2 = await prisma.actions.create({
  data: {
    actionVal:   false,
    createdAt:   new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
    sentAt:      new Date(Date.now() - 1000 * 60 * 9),
    ackedAt:     new Date(Date.now() - 1000 * 60 * 8),
    fk_actuator: actuatorA1.id,
  },
})

console.log("✅ Actions seeded")

// ─── EnvironmentData (sensor readings) ───────────────────────────
// Simulate readings over the last hour for Parcelle A moisture sensor

const now = Date.now()
const readings = [
  { value: 45.2, rawValue: 463, minutesAgo: 60 },
  { value: 48.5, rawValue: 497, minutesAgo: 50 },
  { value: 52.1, rawValue: 534, minutesAgo: 40 },
  { value: 68.3, rawValue: 699, minutesAgo: 30 }, // valve opened → moisture rises
  { value: 71.5, rawValue: 733, minutesAgo: 20 },
  { value: 70.2, rawValue: 719, minutesAgo: 10 },
  { value: 69.8, rawValue: 715, minutesAgo:  0 },
]

for (const r of readings) {
  await prisma.environmentData.create({
    data: {
      value:      r.value,
      unit:       "%",
      rawValue:   r.rawValue,
      createdAt:  new Date(now - r.minutesAgo * 60 * 1000),
      fk_sensor:  sensorA1.id,
      fk_action:  r.minutesAgo >= 30 ? action1.id : action2.id,
    },
  })
}

console.log("✅ EnvironmentData seeded (7 readings for Sensor-A1)")

// ─── Schedules ────────────────────────────────────────────────────
await prisma.schedule.upsert({
  where: { id: "schedule-seed-1" },
  update: {},
  create: {
    id:                 "schedule-seed-1",
    name:               "Arrosage matin — Parcelle A",
    repeatEveryDays:    1,
    duration:           1200,       // 20 minutes in seconds
    isActive:           true,
    startAt:            new Date("2000-01-01T06:00:00"),
    startDate:          new Date(),
    endDate:            new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days
    weekDays:           ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    toggleAtThresholds: true,
    fk_actuator:        actuatorA1.id,
  },
})

await prisma.schedule.upsert({
  where: { id: "schedule-seed-2" },
  update: {},
  create: {
    id:                 "schedule-seed-2",
    name:               "Arrosage soir — Parcelle B",
    repeatEveryDays:    2,
    duration:           2100,       // 35 minutes
    isActive:           true,
    startAt:            new Date("2000-01-01T18:30:00"),
    startDate:          new Date(),
    endDate:            new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    weekDays:           ["MONDAY", "WEDNESDAY", "FRIDAY", "SUNDAY"],
    toggleAtThresholds: false,
    fk_actuator:        actuatorB1.id,
  },
})

console.log("✅ Schedules seeded")
console.log("🌱 Full demo data seeded successfully!")

}
};

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
