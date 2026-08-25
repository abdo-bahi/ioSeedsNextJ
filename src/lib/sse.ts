type SSEClient = {
    id:         string
    controller: ReadableStreamDefaultController
  }
  // later on we may consider adding users, farms filtering on broadcasting incha'Allah
  const clients = new Map<string, SSEClient>()
  
  export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
    clients.set(id, { id, controller })
  }
  
  export function removeSSEClient(id: string) {
    clients.delete(id)
  }
  
  function broadcast(event: string, data: unknown) {
    const payload  = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    const encoder  = new TextEncoder()
    for (const client of clients.values()) {
      try {
        client.controller.enqueue(encoder.encode(payload))
      } catch {
        removeSSEClient(client.id)
      }
    }
  }
  
  export const sseEvents = {
    sensorReading: (data: unknown) => broadcast("sensor_reading", data),
    actuatorState: (data: unknown) => broadcast("actuator_state", data),
    deviceStatus:  (data: unknown) => broadcast("device_status",  data),
    commandAck:    (data: unknown) => broadcast("command_ack",    data),
  }