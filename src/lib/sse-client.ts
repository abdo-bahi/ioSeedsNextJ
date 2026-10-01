"use client"

// One shared EventSource for the whole app.
// The dashboard mounts several components that each need live events; a raw
// EventSource per component exhausts the browser's ~6 connections-per-host
// limit, which made other requests (e.g. the actuator toggle) queue forever.

type Handler = (data: unknown) => void

const listeners = new Map<string, Set<Handler>>()
let es: EventSource | null = null

function emit(event: string, raw: string) {
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    /* keep raw string */
  }
  const set = listeners.get(event)
  if (!set) return
  for (const h of set) {
    try {
      h(data)
    } catch (err) {
      console.error(err)
    }
  }
}

function ensure() {
  if (es) return es

  const EVENTS = [
    "connected",
    "sensor_reading",
    "actuator_state",
    "device_status",
    "command_ack",
    "notification",
  ]

  es = new EventSource("/api/sse")
  for (const ev of EVENTS) {
    es.addEventListener(ev, (e) => emit(ev, (e as MessageEvent).data))
  }
  // EventSource auto-reconnects on error; nothing to do here.
  es.onerror = () => {}
  return es
}

export function subscribe(event: string, handler: Handler): () => void {
  ensure()
  let set = listeners.get(event)
  if (!set) {
    set = new Set()
    listeners.set(event, set)
  }
  set.add(handler)
  return () => set!.delete(handler)
}