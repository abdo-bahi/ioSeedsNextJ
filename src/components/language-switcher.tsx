"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/locale-provider";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav.languageToggle")}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-green-soft hover:text-primary"
      >
        <Languages className="h-[16px] w-[16px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setLocale(option.value)}
            className={`cursor-pointer ${
              locale === option.value ? "bg-green-soft text-foreground" : ""
            }`}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
