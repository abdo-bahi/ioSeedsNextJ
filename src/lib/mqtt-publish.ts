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