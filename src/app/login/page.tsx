"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Label }  from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    console.log('email : ' , email, '\npassword : ' , password);
    
    const result = await signIn.email({
      email,
      password,
      callbackURL: "/",
      fetchOptions: {
        onError: (ctx) => {
          setError(ctx.error.message ?? "Email ou mot de passe incorrect.")
          setLoading(false)
        },
        onSuccess: () => {
          router.push("/")
          router.refresh()
        }
      }
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at 60% 40%, #d4edda 0%, #e8f5e9 40%, #f1f8f2 100%)"
      }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-2xl bg-[#2D5C42] flex items-center justify-center shadow-lg">
            {/* Water drop leaf icon */}
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#4CAF7D]">
              <path d="M12 2C6 8 4 12 4 15a8 8 0 0016 0c0-3-2-7-8-13z"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-[#1A2E22]">IOSeeds</h1>
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#5A7A65] uppercase">
              Smart Irrigation
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-2xl border border-[#D6E8DC] shadow-sm p-6">
          <h2 className="text-[16px] font-semibold text-[#1A2E22] mb-5">
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">
                Adresse e-mail
              </Label>
              <Input
                type="email"
                placeholder="abderrahmane@ioseeds.dz"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[#5A7A65]">
                Mot de passe
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="border-[#D6E8DC] focus-visible:ring-[#4CAF7D] h-11"
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#D95F5F] bg-[#FDEAEA] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1A3C2E] hover:bg-[#2D5C42] text-white h-11 text-[14px] font-medium mt-1 rounded-xl"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}