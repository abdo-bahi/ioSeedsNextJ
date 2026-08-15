"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon, LogOut, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart2,
  Cpu,
  Database,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react";
import { authClient, signOut } from "@/lib/auth-client";
import { useFieldStore } from "@/store/field-store";
import { trpc } from "@/lib/trpc/client";

let FARM_ID:string;

const navItems = [
  {
    label: "Tableau de bord",
    subtitle: "Lectures en direct et actions",
    icon: LayoutDashboard,
    href: "/",
    active: true,
  },
  {
    label: "Statistiques",
    subtitle: "Graphiques et historique",
    icon: BarChart2,
    href: "/statistics",
  },
  {
    label: "Données",
    subtitle: "Champs, microcontrôleurs, capteurs...",
    icon: Database,
    href: "/data",
  },
  {
    label: "Programmes",
    subtitle: "Règles et configurations d'irrigation",
    icon: CalendarClock,
    href: "/schedules",
  },
  {
    label: "Paramètres",
    subtitle: "Paramètres de la ferme et du système",
    icon: SlidersHorizontal,
    href: "/parameters",
  },
  {
    label: "Utilisateurs",
    subtitle: "Gestion des utilisateurs du système",
    icon: Users,
    href: "/users",
  },
];

export function AppSidebar({farms, user}: {farms:any, user:any}) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const reset  = useFieldStore(s => s.reset)
  const { selectedField } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";
  const { data: farm, isLoading } = trpc.farmingUnit.getById.useQuery(
    { id: FARM_ID }
  )
  const router = useRouter()
  
  async function handleLogout() {
    reset()                                    // clear field store
    await authClient.signOut()                 // clear Better Auth session
    router.push("/login")
  }
  
  return (
    <Sidebar className="border-r border-[#D6E8DC] bg-white">
      {/* ── Header ── */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4CAF7D]">
            {/* leaf icon */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 1-2 4-4 4-4S10 2 7 7c-2 3-1 6 0 8 3-5 10-7 10-7Z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#1A2E22]">IOSeeds</p>
            <p className="text-[10px] font-medium tracking-widest text-[#4CAF7D] uppercase">
              {isLoading ? '***' : farm.name}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    className={`
                      h-auto px-3 py-2.5 rounded-lg
                      hover:bg-[#E8F4ED] hover:text-[#1A3C2E]
                      data-[active=true]:bg-[#E8F4ED] data-[active=true]:text-[#1A3C2E]
                    `}
                  >
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          (pathname === item.href) ? "text-[#4CAF7D]" : "text-[#8FAF9A]"
                        }`}
                      />
                      <div className="flex flex-col leading-tight">
                        <span
                          className={`text-[13.5px] font-medium ${
                            (pathname === item.href) ? "text-[#1A3C2E]" : "text-[#3A5A44]"
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="text-[11px] text-[#8FAF9A] font-normal">
                          {item.subtitle}
                        </span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="px-4 py-4 border-t border-[#D6E8DC]">
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[13px] font-medium text-[#1A2E22] truncate">
              {session?.user.name}
            </span>
            <span className="text-[11px] text-[#8FAF9A]">Administrateur</span>
          </div>
        </div>
        <button
        onClick={handleLogout}
        className="absolute right-2 text-[#8FAF9A]  hover:text-[#D95F5F] transition-colors p-1 rounded"
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
      </button>
      </SidebarFooter>
    </Sidebar>
  );
}
