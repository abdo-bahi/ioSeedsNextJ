// test-prisma.ts
import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

async function main() {
  console.log("🔍 DATABASE_URL:", process.env.DATABASE_URL)
  
  const mcus = await prisma.mCU.findMany()
  console.log("📡 MCUs found:", mcus.length)

  const sensors = await prisma.sensor.findMany()
  console.log("🌡 Sensors found:", sensors.length)

  await prisma.$disconnect()
}

main().catch(console.error)