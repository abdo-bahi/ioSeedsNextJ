"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";

type DateFilterProps = {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
};

export function DateFilter({ from, to, onFrom, onTo }: DateFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">{t("common.from")}</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="border-border focus-visible:ring-primary h-7 text-[11px] w-[140px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">{t("common.to")}</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="border-border focus-visible:ring-primary h-7 text-[11px] w-[140px]"
        />
      </div>
    </div>
  );
}