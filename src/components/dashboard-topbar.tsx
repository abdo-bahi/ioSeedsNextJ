"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sprout, RotateCcw, Bell } from "lucide-react";

import { useFieldStore } from "@/store/field-store"

// to change selected field later from db + and fetch for actuel data ***********************


export function DashboardTopbar() {
  const { fields, selectedField, setField } = useFieldStore();

  const notifCount = 2;

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#D6E8DC] h-[56px]">
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-[#8FAF9A] hover:text-[#1A3C2E] hover:bg-[#E8F4ED]" />

        {/* to change later ***************************** */}

        <span className="text-[14px] font-medium text-[#8FAF9A]">
          Dashboard
        </span>

        {/* ── Field selector pill ── */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-[36px] px-3 rounded-lg border border-[#D6E8DC] bg-white hover:bg-[#E8F4ED] hover:border-[#4CAF7D] outline-none">
            <Sprout className="h-[15px] w-[15px] text-[#4CAF7D]" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold text-[#1A2E22]">
                {selectedField.name}
              </span>
              <span className="text-[10px] text-[#8FAF9A]">
                {selectedField.crop}
              </span>
            </div>
            <ChevronDown className="h-[13px] w-[13px] text-[#8FAF9A] ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            {fields.map((field) => (
              <DropdownMenuItem
                key={field.name}
                onClick={() => setField(field)}
                className={`flex flex-col items-start gap-0 cursor-pointer ${
                  selectedField.name === field.name
                    ? "bg-[#E8F4ED] text-[#1A3C2E]"
                    : ""
                }`}
              >
                <span className="text-[13px] font-medium">{field.name}</span>
                <span className="text-[11px] text-[#8FAF9A]">{field.crop}</span>
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
          className="h-[36px] w-[36px] text-[#8FAF9A] hover:text-[#4CAF7D] hover:bg-[#E8F4ED]"
        >
          <RotateCcw className="h-[16px] w-[16px]" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative h-[36px] w-[36px] text-[#8FAF9A] hover:text-[#4CAF7D] hover:bg-[#E8F4ED]"
        >
          <Bell className="h-[16px] w-[16px]" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-[16px] w-[16px] rounded-full bg-[#D95F5F] text-white text-[9px] font-bold flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
