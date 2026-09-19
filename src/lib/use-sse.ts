"use client"

import { useEffect } from "react"

type SSEHandlers = {
  sensor_reading?: (data: unknown) => void
  actuator_state?: (data: unknown) => void
  device_status?:  (data: unknown) => void
  command_ack?:    (data: unknown) => void
  notification?:   (data: unknown) => void
  connected?:      (data: unknown) => void
}

export function useSSE(handlers: SSEHandlers) {
  useEffect(() => {
    const es = new EventSource("/api/sse")

    function attach(event: string, handler?: (data: unknown) => void) {
      if (!handler) return
      es.addEventListener(event, (e: MessageEvent) => {
        try   { handler(JSON.parse(e.data)) }
        catch { handler(e.data) }
      })
    }

    attach("connected",      handlers.connected)
    attach("sensor_reading", handlers.sensor_reading)
    attach("actuator_state", handlers.actuator_state)
    attach("device_status",  handlers.device_status)
    attach("command_ack",    handlers.command_ack)
    attach("notification",   handlers.notification)

    es.onerror = () => console.warn("SSE disconnected — will reconnect")

    return () => es.close()
  }, [])
}