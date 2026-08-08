import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"
import { auth } from "./auth"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    inferAdditionalFields<typeof auth>()  // ← pulls fk_farm into session type
  ]
})

export const { signIn, signUp, useSession, signOut } = createAuthClient()
