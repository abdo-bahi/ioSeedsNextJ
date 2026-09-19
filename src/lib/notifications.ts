import { sseEvents } from "./sse"

type NotifPayload = {
  type:         "MIN_THRESHOLD" | "MAX_THRESHOLD" | "ACTUATOR_MANUAL" |
                "ACTUATOR_AUTO" | "MCU_INACTIVE"  | "DEVICE_INACTIVE"
  title:        string
  message:      string
  fk_sensor?:   string
  fk_actuator?: string
  fk_mcu?:      string
  fieldId?:     string
}

const prefKey = {
  MIN_THRESHOLD:   "minThreshold",
  MAX_THRESHOLD:   "maxThreshold",
  ACTUATOR_MANUAL: "actuatorManual",
  ACTUATOR_AUTO:   "actuatorAuto",
  MCU_INACTIVE:    "mcuInactive",
  DEVICE_INACTIVE: "deviceInactive",
} as const

type DB = (typeof import("../../prisma/lib/prisma"))["prisma"]

async function getUsersForField(prisma: DB, fieldId?: string) {
  if (!fieldId) return []

  const members = await prisma.roleMember.findMany({
    where:  { fk_irrigationField: fieldId },
    select: { user: { select: { id: true, email: true } } },
  })

  const field = await prisma.irrigationField.findUnique({
    where:   { id: fieldId },
    include: { FarmingUnit: { select: { owner: { select: { id: true, email: true } } } } },
  })

  const users: { id: string; email: string }[] = []
  for (const m of members) if (m.user) users.push(m.user)
  if (field?.FarmingUnit.owner) users.push(field.FarmingUnit.owner)

  return [...new Map(users.map(u => [u.id, u])).values()]
}

async function sendEmail({ to, subject, text }: {
  to:      string
  subject: string
  text:    string
}) {
  console.log(`📧 Email to ${to}: ${subject}`)
  console.log(`   ${text}`)
}

async function run(
  prisma: DB,
  payload: NotifPayload,
  push: (data: unknown) => void
) {
  const users = await getUsersForField(prisma, payload.fieldId)
  if (!users.length) return

  for (const user of users) {
    let pref = await prisma.notificationPreference.findUnique({
      where: { fk_user: user.id },
    })
    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: { fk_user: user.id },
      })
    }

    const channel = pref[prefKey[payload.type]]

    if (channel === "NONE") continue

    if (channel === "INAPP" || channel === "BOTH") {
      const notif = await prisma.notification.create({
        data: {
          type:        payload.type,
          title:       payload.title,
          message:     payload.message,
          fk_user:     user.id,
          fk_sensor:   payload.fk_sensor,
          fk_actuator: payload.fk_actuator,
          fk_mcu:      payload.fk_mcu,
        },
      })

      push({
        userId:  user.id,
        notifId: notif.id,
        type:    payload.type,
        title:   payload.title,
        message: payload.message,
      })
    }

    if (channel === "EMAIL" || channel === "BOTH") {
      await sendEmail({
        to:      user.email,
        subject: payload.title,
        text:    payload.message,
      })
    }
  }
}

export async function notify(
  payload: NotifPayload,
  push: (data: unknown) => void = sseEvents.notification
) {
  const { prisma } = await import("../../prisma/lib/prisma")
  await run(prisma, payload, push)
}