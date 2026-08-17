
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/routers/_app.router"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint:      "/api/trpc",
    req,
    router:        appRouter,
    createContext: () => ({}),  // empty context for now — auth added later
    onError: ({ error, path, input }) => {
      console.error(`❌ tRPC error on [${path}]`)
      console.error("Input:", JSON.stringify(input, null, 2))
      console.error("Error:", error.message)
      console.error("Stack:", error.stack)
    },
  })

export { handler as GET, handler as POST }