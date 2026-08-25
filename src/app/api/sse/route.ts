import { auth } from "@/lib/auth"
import { addSSEClient, removeSSEClient } from "@/lib/sse"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Auth check
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const clientId = randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller)

      // Initial heartbeat
      const encoder = new TextEncoder()
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`)
      )
    },
    cancel() {
      removeSSEClient(clientId)
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    }
  })
}