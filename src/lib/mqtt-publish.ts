export async function publishToMCU(topic: string, payload: object) {
    try {
      const res = await fetch(`${process.env.WORKER_HTTP_URL}`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-worker-key":  process.env.WORKER_SECRET ?? "",
        },
        body: JSON.stringify({ topic, payload }),
      })
  
      if (!res.ok) {
        console.error("❌ Publish failed:", await res.text())
      }
    } catch (err) {
      console.error("❌ Worker not reachable:", err)
    }
  }

  export async function publishSchedulesToMCU(
    farmId:  string,
    fieldId: string,
    mcuId:   string,
    schedules: {
      id:                 string
      name:               string
      isActive:           boolean
      duration:           number
      startAt:            Date | null
      startDate:          Date | null
      endDate:            Date | null
      weekDays:           string[]
      repeatEveryDays:    number
      toggleAtThresholds: boolean
      actuatorId:         string
    }[]
  ) {
    await publishToMCU(
      `irrigation/${farmId}/${fieldId}/${mcuId}/schedules`,
      {
        commandId: `schedules-${Date.now()}`,
        schedules,
      }
    )
  }