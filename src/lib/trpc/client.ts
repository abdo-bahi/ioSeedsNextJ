import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@/server/routers/_app.router"

export const trpc = createTRPCReact<AppRouter>()