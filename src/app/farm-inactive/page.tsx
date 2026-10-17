"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n"

export default function FarmInactivePage() {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push("/login")
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, #f6d9d9 0%, #f8ecec 40%, #fdf6f6 100%)",
      }}
    >
      <div className="w-full max-w-[420px] bg-card rounded-2xl border border-border shadow-sm p-8 text-center flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-[#D95F5F]/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#D95F5F]">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <h1 className="text-[18px] font-bold text-foreground">
          {t("auth.farmInactive.title")}
        </h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t("auth.farmInactive.message")}
        </p>
        <Button
          onClick={handleLogout}
          className="bg-primary hover:bg-primary/90 text-white h-11 text-[14px] font-medium mt-2 rounded-xl w-full"
        >
          {t("auth.farmInactive.logout")}
        </Button>
      </div>
    </div>
  )
}
