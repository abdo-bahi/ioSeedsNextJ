import { sseEvents } from "@/lib/sse"

export async function POST(req: Request) {
  console.log("📡 /api/sse/broadcast CALLED")

  const workerKey = req.headers.get("x-worker-key")
  if (workerKey !== process.env.WORKER_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { event, data } = await req.json()

  switch (event) {
    case "sensor_reading": sseEvents.sensorReading(data); break
    case "actuator_state": sseEvents.actuatorState(data); break
    case "device_status":  sseEvents.deviceStatus(data);  break
    case "command_ack":    sseEvents.commandAck(data);    break
    default:
      return Response.json({ error: "Unknown event" }, { status: 400 })
  }

  return Response.json({ ok: true })
}