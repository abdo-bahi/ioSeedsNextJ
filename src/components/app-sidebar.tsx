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
  ScrollText,
} from "lucide-react";
import { authClient, signOut } from "@/lib/auth-client";
import { useFieldStore } from "@/store/field-store";
import { trpc } from "@/lib/trpc/client";
import { t } from "@/i18n";

let FARM_ID: string;

const navItems = [
  {
    labelKey: "nav.dashboard",
    subtitleKey: "nav.subtitle.dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    labelKey: "nav.statistics",
    subtitleKey: "nav.subtitle.statistics",
    icon: BarChart2,
    href: "/statistics",
  },
  {
    labelKey: "nav.data",
    subtitleKey: "nav.subtitle.data",
    icon: Database,
    href: "/data",
  },
  {
    labelKey: "nav.schedules",
    subtitleKey: "nav.subtitle.schedules",
    icon: CalendarClock,
    href: "/schedules",
  },
  {
    labelKey: "nav.parameters",
    subtitleKey: "nav.subtitle.parameters",
    icon: SlidersHorizontal,
    href: "/parameters",
  },
  {
    labelKey: "nav.users",
    subtitleKey: "nav.subtitle.users",
    icon: Users,
    href: "/users",
    adminOnly: true,
  },
  {
    labelKey: "nav.audit",
    subtitleKey: "nav.subtitle.audit",
    icon: ScrollText,
    href: "/audit",
    adminOnly: true,
  },
];

export function AppSidebar({ farms, user }: { farms: any; user: any }) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const reset = useFieldStore((s) => s.reset);
  const { selectedField } = useFieldStore();

  FARM_ID = selectedField?.fk_FarmingUnit ?? "Unnamed farm";
  const { data: farm, isLoading } = trpc.farmingUnit.getById.useQuery({
    id: FARM_ID,
  });
  const router = useRouter();

  async function handleLogout() {
    reset(); // clear field store
    await authClient.signOut(); // clear Better Auth session
    router.push("/login");
  }

  return (
    <Sidebar className="border-r border-border bg-card">
      {/* ── Header ── */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            {/* leaf icon */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 1-2 4-4 4-4S10 2 7 7c-2 3-1 6 0 8 3-5 10-7 10-7Z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">IOSeeds</p>
            <p className="text-[10px] font-medium tracking-widest text-primary uppercase">
              {isLoading ? "***" : farm?.name ?? "—"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(
                (item) =>
                  (!item.adminOnly || session?.user?.role === "admin") && (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        className={`
                      h-auto px-3 py-2.5 rounded-lg
                      hover:bg-green-soft hover:text-foreground
                      data-[active=true]:bg-green-soft data-[active=true]:text-foreground
                    `}
                      >
                        <a href={item.href} className="flex items-center gap-3">
                          <item.icon
                            className={`h-[18px] w-[18px] shrink-0 ${
                              pathname === item.href
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div className="flex flex-col leading-tight">
                            <span
                              className={`text-[13.5px] font-medium ${
                                pathname === item.href
                                  ? "text-foreground"
                                  : "text-[#3A5A44]"
                              }`}
                            >
                              {t(item.labelKey)}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {t(item.subtitleKey)}
                            </span>
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex flex-row items-center gap-2 leading-tight min-w-0">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() ?? "?"}
              {user.name?.[1]?.toUpperCase() ?? "?"}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-foreground truncate">
                {session?.user?.name ?? user?.name ?? "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {session?.user?.role ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="absolute right-2 text-muted-foreground  hover:text-[#D95F5F] transition-colors p-1 rounded"
          title={t("nav.logout")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
