"use client"

import { useEffect, useRef } from "react"
import { subscribe } from "@/lib/sse-client"

type SSEHandlers = {
  sensor_reading?: (data: unknown) => void
  actuator_state?: (data: unknown) => void
  device_status?:  (data: unknown) => void
  command_ack?:    (data: unknown) => void
  notification?:   (data: unknown) => void
  connected?:      (data: unknown) => void
}

// Subscribes to the app-wide shared EventSource (see sse-client).
// The effect only subscribes once; events are dispatched through the latest
// handlers via a ref, so closures never go stale across re-renders.
export function useSSE(handlers: SSEHandlers) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    const events = Object.keys(handlersRef.current) as (keyof SSEHandlers)[]
    const unsubs = events.map((event) =>
      subscribe(event, (data) => {
        const handler = handlersRef.current[event]
        if (handler) handler(data)
      })
    )

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [])
}