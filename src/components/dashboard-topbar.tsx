"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sprout, RotateCcw, Moon, Sun } from "lucide-react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useFieldStore } from "@/store/field-store"
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

// to change selected field later from db + and fetch for actuel data ***********************


export function DashboardTopbar() {
  const { fields, selectedField, setField } = useFieldStore()

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border h-[56px]">
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-green-soft" />

        {/* to change later ***************************** */}

        <span className="text-[14px] font-medium text-muted-foreground">
          {pathname === '/' ? 'Dashboard': pathname.replace(/^\/(.)/, (_, char) => char.toUpperCase())}
        </span>

        {/* ── Field selector pill ── */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-[36px] px-3 rounded-lg border border-border bg-card hover:bg-green-soft hover:border-primary outline-none">
            <Sprout className="h-[15px] w-[15px] text-primary" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold text-foreground">
                {selectedField?.name}
              </span>
            </div>
            <ChevronDown className="h-[13px] w-[13px] text-muted-foreground ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            {fields?.map((field) => (
              <DropdownMenuItem
                key={field.name}
                onClick={() => setField(field)}
                className={`flex flex-col items-start gap-0 cursor-pointer ${
                  selectedField?.name === field.name
                    ? "bg-green-soft text-foreground"
                    : ""
                }`}
              >
                <span className="text-[13px] font-medium">{field.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Right: refresh + notification ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-[36px] w-[36px] text-muted-foreground hover:text-primary hover:bg-green-soft"
        >
          <RotateCcw className="h-[16px] w-[16px]" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className="h-[36px] w-[36px] text-muted-foreground hover:text-primary hover:bg-green-soft"
        >
          {theme === "dark" ? (
            <Sun className="h-[16px] w-[16px]" />
          ) : (
            <Moon className="h-[16px] w-[16px]" />
          )}
        </Button>

        <NotificationBell />
      </div>
    </header>
  );
}
