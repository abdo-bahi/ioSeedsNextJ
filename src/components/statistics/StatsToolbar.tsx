"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type FieldOption = { id: string; name: string };

type StatsToolbarProps = {
  startDate: string;
  endDate: string;
  fieldId: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onFieldChange: (v: string) => void;
  fieldOptions: FieldOption[];
  onExport: () => void;
  exporting: boolean;
};

export function StatsToolbar({
  startDate,
  endDate,
  fieldId,
  onStartChange,
  onEndChange,
  onFieldChange,
  fieldOptions,
  onExport,
  exporting,
}: StatsToolbarProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Statistiques
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Filtrez la période et la parcelle pour recalculer les indicateurs
            et graphiques.
          </p>
        </div>

        <Button
          onClick={onExport}
          disabled={exporting}
          className="bg-primary hover:bg-primary/90 text-white text-[12px] h-8 px-3 gap-1.5"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Exporter Excel
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Date début</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="border-border focus-visible:ring-primary h-8 text-[12px] w-[150px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Date fin</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="border-border focus-visible:ring-primary h-8 text-[12px] w-[150px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Parcelle</Label>
          <select
            value={fieldId}
            onChange={(e) => onFieldChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">
              Tous les champs ({fieldOptions.length})
            </option>
            {fieldOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}