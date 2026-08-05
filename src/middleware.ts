import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isLoginPage  = request.nextUrl.pathname === "/login"
  const isAuthRoute  = request.nextUrl.pathname.startsWith("/api/auth")
  const isPublic     = isLoginPage || isAuthRoute

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}