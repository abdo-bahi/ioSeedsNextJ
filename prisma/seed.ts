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

  const admin = await prisma.user.create({
    data: {
      name:      "admin",
      email:     "adminn@ioseeds.dz",
      hash:      hash,
      fk_wilaya: wilaya!.id,
    },
  })
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
