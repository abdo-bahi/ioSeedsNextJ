"use client";

import { useState } from "react";

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

const navItems = [
  {
    label: "Dashboard",
    subtitle: "Live readings & actions",
    icon: LayoutDashboard,
    href: "/",
    active: true,
  },
  {
    label: "Statistics",
    subtitle: "Charts & history",
    icon: BarChart2,
    href: "/",
  },
  {
    label: "Devices",
    subtitle: "MCUs, sensors, actuators",
    icon: Cpu,
    href: "/",
  },
  {
    label: "Data",
    subtitle: "Fields, MCUs, sensors...",
    icon: Database,
    href: "/data",
  },
  {
    label: "Schedules",
    subtitle: "Rules & configs",
    icon: CalendarClock,
    href: "/schedules",
  },
  {
    label: "Parameters",
    subtitle: "Farm & system settings",
    icon: SlidersHorizontal,
    href: "/parameters",
  },
];

export function AppSidebar() {
  const [activeLabel, setActiveLabel] = useState("Dashboard");
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
              Smart Irrigation
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
                    onClick={() => setActiveLabel(item.label)}
                    isActive={item.active}
                    className={`
                      h-auto px-3 py-2.5 rounded-lg
                      hover:bg-[#E8F4ED] hover:text-[#1A3C2E]
                      data-[active=true]:bg-[#E8F4ED] data-[active=true]:text-[#1A3C2E]
                    `}
                  >
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          item.active ? "text-[#4CAF7D]" : "text-[#8FAF9A]"
                        }`}
                      />
                      <div className="flex flex-col leading-tight">
                        <span
                          className={`text-[13.5px] font-medium ${
                            item.active ? "text-[#1A3C2E]" : "text-[#3A5A44]"
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
              Bahi Abderrahamane
            </span>
            <span className="text-[11px] text-[#8FAF9A]">Administrateur</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
