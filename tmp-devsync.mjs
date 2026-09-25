import { appRouter } from "./src/server/routers/_app.router"
import mqtt from "mqtt"
import { readFileSync } from "node:fs"
import { parse } from "dotenv"
const env = parse(readFileSync(".env", "utf8"))

function waitConnect(c) { return new Promise((r) => c.once("connect", r)) }
function waitMsg(topic, ms) {
  return new Promise((r) => {
    const t = setTimeout(() => r(`${topic}: TIMEOUT`), ms)
    process.stdout.write(`subscribing ${topic as string}\n`)
    const c = mqtt.connect("mqtt://localhost:1883", { username: env.MQTT_USER.replace(/^"|"$/g, ""), password: env.MQTT_PASSWORD.replace(/^"|"$/g, ""), clientId: "devsync-" + Math.random().toString(36).slice(2), clean: true })
    let done = false
    c.on("connect", () => {
      c.subscribe(topic)
      c.once("message", (t, p) => { clearTimeout(t2); done = true; r(`${t} => ${p.toString()}`); c.end() })
    })
    const t2 = setTimeout(() => { if (!done) { c.end(); r(`${topic}: TIMEOUT`) } }, ms)
  })
}

async function main() {
  const caller = appRouter.createCaller({ session: { user: { id: "u1", email: "a@b.c", name: "t" } }, headers: new Headers() })

  // pick the MCU from the .ino sketch farm
  const mcu = await caller.mcu.getByFarm?.({ farmId: "cmsj9pj3i000vkcbisbbrib12" }).catch(() => null) as any[]
  const mcuId = mcu?.[0]?.id ?? "cmsj9pj4s000zkcbiwo80bdas"

  const actTopic = `irrigation/cmsj9pj3i000vkcbisbbrib12/cmsj9pj3s000wkcbixjdd70n3/${mcuId}/actuators`
  const sensTopic = `irrigation/cmsj9pj3i000vkcbisbbrib12/cmsj9pj3s000wkcbixjdd70n3/${mcuId}/sensors`
  const subA = waitMsg(actTopic, 6000)
  const subS = waitMsg(sensTopic, 6000)

  const name = "TEST-DEV-SYNC-" + Date.now()
  const act = await caller.actuator.create({ name, latitude: 0, longitude: 0, targetState: false, fk_mcu: mcuId })
  const sens = await caller.sensor.create({ name, latitude: 0, longitude: 0, minAnalogue: 0, maxAnalogue: 1023, unit: "%", rowValueConversion: false, fk_mcu: mcuId })

  console.log("actuators retained:", await subA)
  console.log("sensors retained:", await subS)

  // cleanup: delete both → should re-publish (retained) without them
  const dsubA = waitMsg(actTopic, 6000)
  const dsubS = waitMsg(sensTopic, 6000)
  await caller.actuator.delete({ id: act.id })
  await caller.sensor.delete({ id: sens.id })
  console.log("post-delete actuators:", (await dsubA))
  console.log("post-delete sensors:", (await dsubS))

  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })