"use client"

import { useEffect } from "react"

type SSEHandlers = {
  sensor_reading?: (data: any) => void
  actuator_state?: (data: any) => void
  device_status?:  (data: any) => void
  command_ack?:    (data: any) => void
  connected?:      (data: any) => void
}

export function useSSE(handlers: SSEHandlers) {
  useEffect(() => {
    const es = new EventSource("/api/sse")

    function attach(event: string, handler?: (data: any) => void) {
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

    es.onerror = () => console.warn("SSE disconnected — will reconnect")

    return () => es.close()
  }, [])
}