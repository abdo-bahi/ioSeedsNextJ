
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/routers/_app.router"
import { auth } from "@/lib/auth"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint:      "/api/trpc",
    req,
    router:        appRouter,
    createContext: async () => {
      const session = await auth.api.getSession({
        headers: req.headers, 
      })
      return {
        session,
        headers: req.headers,
      }
    },
      onError: ({ error, path, input }) => {
      console.error(`❌ tRPC error on [${path}]`)
      console.error("Input:", JSON.stringify(input, null, 2))
      console.error("Error:", error.message)
      console.error("Stack:", error.stack)
    },
  })

export { handler as GET, handler as POST }