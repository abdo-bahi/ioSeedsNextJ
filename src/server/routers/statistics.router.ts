// src/server/routers/statistics.router.ts
import { z } from "zod"
import { protectedProc, router } from "../trpc"
import { prisma } from "../../../prisma/lib/prisma"

// Types considered as irrigation hardware (used for the irrigation KPIs)
const SOIL_MOISTURE_TYPES = ["soil_moisture", "soilMoisture"]

const periodInput = z.object({
  farmId:  z.string(),
  fieldId: z.string().optional(), // undefined ⇒ all fields of the farm
  start:   z.string(),            // YYYY-MM-DD
  end:     z.string(),            // YYYY-MM-DD
})

// ── Helpers ─────────────────────────────────────────────────────────
function toBounds(startStr: string, endStr: string) {
  const start = new Date(`${startStr}T00:00:00`)
  let end = new Date(`${endStr}T23:59:59.999`)
  if (isNaN(start.getTime())) start.setTime(Date.now() - 30 * 86_400_000)
  if (isNaN(end.getTime())) end.setTime(Date.now())
  if (end.getTime() < start.getTime()) end = start
  return { start, end }
}

async function getFieldIds(farmId: string, fieldId?: string) {
  if (fieldId) return [fieldId]
  const fields = await prisma.irrigationField.findMany({
    where: { fk_FarmingUnit: farmId },
    select: { id: true },
  })
  return fields.map((f) => f.id)
}

async function getActuatorTimes(fieldIds: string[], start: Date, end: Date) {
  const now = Date.now()

  const actuators = await prisma.actuator.findMany({
    where: { mcu: { fk_irrigationField: { in: fieldIds } } },
    select: {
      id: true,
      name: true,
      actuatorType: { select: { name: true, isForIrrigation: true } },
      mcu: { select: { name: true } },
    },
  })

  const actions = await prisma.actions.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      actuator: { mcu: { fk_irrigationField: { in: fieldIds } } },
    },
    orderBy: [{ fk_actuator: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      actionVal: true,
      createdAt: true,
      mcuAction: true,
      fk_user: true,
      fk_actuator: true,
    },
  })

  const byActuator = new Map<string, typeof actions>()
  for (const a of actions) {
    if (!byActuator.has(a.fk_actuator)) byActuator.set(a.fk_actuator, [])
    byActuator.get(a.fk_actuator)!.push(a)
  }

  // Determine each actuator's state at the start of the period (latest action before start)
  const initActions = await Promise.all(
    actuators.map((act) =>
      prisma.actions.findFirst({
        where: { fk_actuator: act.id, createdAt: { lt: start } },
        orderBy: { createdAt: "desc" },
        select: { actionVal: true, mcuAction: true, fk_user: true },
      })
    )
  )

  const results: {
    actuatorId:     string
    actuatorName:   string
    mcuName:        string
    actuatorType:   string | null
    isForIrrigation: boolean
    manualMs:       number
    autoMs:         number
    sessions:       number
  }[] = []

  for (let i = 0; i < actuators.length; i++) {
    const act = actuators[i]
    const list = byActuator.get(act.id) ?? []
    const startedAt = initActions[i]

    let open = false
    let openSinceMs = 0
    let openManual = false
    let manualMs = 0
    let autoMs = 0
    let sessions = 0

    // Open session that overlaps the period start
    if (startedAt && startedAt.actionVal === true) {
      open = true
      openSinceMs = start.getTime()
      openManual = startedAt.fk_user != null
    }

    for (const a of list) {
      if (a.actionVal) {
        if (!open) {
          open = true
          openSinceMs = a.createdAt.getTime()
          openManual = a.fk_user != null // manual = issued by a user
        }
      } else {
        if (open) {
          const ms = a.createdAt.getTime() - openSinceMs
          if (ms > 0) {
            if (openManual) manualMs += ms
            else autoMs += ms
            sessions++
          }
          open = false
        }
      }
    }

    // Session still running when the period ends (clamp to now)
    if (open) {
      const tail = Math.min(end.getTime(), now)
      if (tail > openSinceMs) {
        const ms = tail - openSinceMs
        if (openManual) manualMs += ms
        else autoMs += ms
        sessions++
      }
    }

    results.push({
      actuatorId:     act.id,
      actuatorName:   act.name,
      mcuName:        act.mcu?.name ?? "—",
      actuatorType:   act.actuatorType?.name ?? null,
      isForIrrigation: act.actuatorType?.isForIrrigation === true,
      manualMs,
      autoMs,
      sessions,
    })
  }

  return results
}

// ── Router ──────────────────────────────────────────────────────────
export const statisticsRouter = router({

  // List of sensors for the "real time" selector (farm or field scope)
  sensors: protectedProc
    .input(z.object({ farmId: z.string(), fieldId: z.string().optional() }))
    .query(async ({ input }) => {
      const fieldIds = await getFieldIds(input.farmId, input.fieldId)
      return prisma.sensor.findMany({
        where: { isActive: true, mcu: { fk_irrigationField: { in: fieldIds } } },
        select: { id: true, name: true, fk_sensorType: true, unit: true },
        orderBy: { name: "asc" },
      })
    }),

  // ── KPI overview ──────────────────────────────────────────────────
  overview: protectedProc
    .input(periodInput)
    .query(async ({ input }) => {
      const { start, end } = toBounds(input.start, input.end)
      const fieldIds = await getFieldIds(input.farmId, input.fieldId)
      const rows = await getActuatorTimes(fieldIds, start, end)

      const irrigation = rows.filter((r) => r.isForIrrigation)
      const totalMs = irrigation.reduce((s, r) => s + r.manualMs + r.autoMs, 0)
      const sessions = irrigation.reduce((s, r) => s + r.sessions, 0)
      const manualMs = irrigation.reduce((s, r) => s + r.manualMs, 0)
      const autoMs = irrigation.reduce((s, r) => s + r.autoMs, 0)

      const soilSensors = await prisma.sensor.findMany({
        where: {
          fk_sensorType: { in: SOIL_MOISTURE_TYPES },
          mcu: { fk_irrigationField: { in: fieldIds } },
        },
        select: { id: true },
      })
      const soilUnit =
        (await prisma.sensor.findFirst({
          where: {
            fk_sensorType: { in: SOIL_MOISTURE_TYPES },
            mcu: { fk_irrigationField: { in: fieldIds } },
          },
          select: { unit: true },
        }))?.unit ?? "%"

      let avgSoil: number | null = null
      if (soilSensors.length > 0) {
        const placeholders = soilSensors.map((_, i) => `$${i + 1}`).join(", ")
        const rows = await prisma.$queryRawUnsafe<{ avg: number }[]>(
          `SELECT avg(CASE WHEN s."rowValueConversion"
                      THEN s."minToConvertValue" + ((COALESCE(e."rawValue", e."value") - s."minAnalogue") / NULLIF(s."maxAnalogue" - s."minAnalogue", 0)) * (s."maxToConvertValue" - s."minToConvertValue")
                      ELSE e."value" END)::float8 AS avg
           FROM "EnvironmentData" e
           JOIN "Sensor" s ON s."id" = e."fk_sensor"
           WHERE e."fk_sensor" IN (${placeholders})
             AND e."createdAt" >= $${soilSensors.length + 1}
             AND e."createdAt" <= $${soilSensors.length + 2}`,
          ...soilSensors.map((s) => s.id),
          start,
          end
        )
        avgSoil = rows[0]?.avg != null ? parseFloat(rows[0].avg.toFixed(1)) : null
      }

      const denom = manualMs + autoMs || 1

      return {
        totalIrrigationMs: totalMs,
        irrigationSessions: sessions,
        avgSessionMs: sessions ? Math.round(totalMs / sessions) : 0,
        avgSoilMoisture: avgSoil,
        soilMoistureUnit: soilUnit,
        manualMs,
        autoMs,
        manualPct: Math.round((manualMs / denom) * 100),
        autoPct: Math.round((autoMs / denom) * 100),
      }
    }),

  // ── Manual vs auto activation time per actuator ──────────────────
  actionTimes: protectedProc
    .input(periodInput)
    .query(async ({ input }) => {
      const { start, end } = toBounds(input.start, input.end)
      const fieldIds = await getFieldIds(input.farmId, input.fieldId)
      const rows = await getActuatorTimes(fieldIds, start, end)
      return rows
        .filter((r) => r.manualMs > 0 || r.autoMs > 0)
        .sort((a, b) => b.manualMs + b.autoMs - (a.manualMs + a.autoMs))
        .map((r) => ({
          actuatorId: r.actuatorId,
          actuatorName: r.actuatorName,
          mcuName: r.mcuName,
          actuatorType: r.actuatorType,
          manualMs: r.manualMs,
          autoMs: r.autoMs,
        }))
    }),

  // ── Average active time (per actuator) grouped by […] type ─────────
  typeAvgTimes: protectedProc
    .input(periodInput)
    .query(async ({ input }) => {
      const { start, end } = toBounds(input.start, input.end)
      const fieldIds = await getFieldIds(input.farmId, input.fieldId)
      const rows = await getActuatorTimes(fieldIds, start, end)

      const byType = new Map<
        string,
        { sumMs: number; count: number; sessions: number }
      >()
      for (const r of rows) {
        const type = r.actuatorType ?? "unknown"
        if (!byType.has(type)) byType.set(type, { sumMs: 0, count: 0, sessions: 0 })
        const g = byType.get(type)!
        g.sumMs += r.manualMs + r.autoMs
        g.count += 1
        g.sessions += r.sessions
      }

      return Array.from(byType.entries())
        .map(([type, g]) => ({
          type,
          avgActiveMs: g.count ? Math.round(g.sumMs / g.count) : 0,
          actuatorCount: g.count,
          totalSessions: g.sessions,
        }))
        .sort((a, b) => b.avgActiveMs - a.avgActiveMs)
    }),

  // ── Average reading per sensor type, bucketed over the period ────
  sensorTypeAverages: protectedProc
    .input(periodInput)
    .query(async ({ input }) => {
      const { start, end } = toBounds(input.start, input.end)
      const fieldIds = await getFieldIds(input.farmId, input.fieldId)

      const sensors = await prisma.sensor.findMany({
        where: { mcu: { fk_irrigationField: { in: fieldIds } } },
        select: { id: true, fk_sensorType: true, unit: true },
      })

      const byType = new Map<string, { ids: string[]; unit: string | null }>()
      for (const s of sensors) {
        const t = s.fk_sensorType ?? "unknown"
        if (!byType.has(t)) byType.set(t, { ids: [], unit: s.unit })
        byType.get(t)!.ids.push(s.id)
      }

      const spanMs = end.getTime() - start.getTime()
      const day = 60 * 24 * 60 * 1000
      const bucketMinutes =
        spanMs <= day
          ? 30
          : spanMs <= 7 * day
            ? 180
            : spanMs <= 30 * day
              ? 720
              : 1440
      const bucketSec = bucketMinutes * 60

      const out: {
        sensorType: string
        unit: string | null
        series: { time: string; value: number }[]
      }[] = []

      for (const [type, info] of byType) {
        if (info.ids.length === 0) continue
        const n = info.ids.length
        const placeholders = info.ids.map((_, i) => `$${i + 2}`).join(", ")
        const rows = await prisma.$queryRawUnsafe<{ bucket: Date; value: number }[]>(
          `SELECT to_timestamp(floor(extract(epoch from e."createdAt") / $1) * $1) AS bucket,
                  avg(CASE WHEN s."rowValueConversion"
                       THEN s."minToConvertValue" + ((COALESCE(e."rawValue", e."value") - s."minAnalogue") / NULLIF(s."maxAnalogue" - s."minAnalogue", 0)) * (s."maxToConvertValue" - s."minToConvertValue")
                       ELSE e."value" END)::float8 AS value
           FROM "EnvironmentData" e
           JOIN "Sensor" s ON s."id" = e."fk_sensor"
           WHERE e."fk_sensor" IN (${placeholders})
             AND e."createdAt" >= $${n + 2}
             AND e."createdAt" <= $${n + 3}
           GROUP BY 1
           ORDER BY 1`,
          bucketSec,
          ...info.ids,
          start,
          end
        )
        out.push({
          sensorType: type,
          unit: info.unit,
          series: rows.map((r) => ({
            time: r.bucket.toISOString(),
            value: parseFloat(r.value.toFixed(1)),
          })),
        })
      }

      return out
    }),
})