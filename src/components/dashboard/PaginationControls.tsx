"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/i18n";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
  disabled?: boolean;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  onPage,
  disabled,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return (
      <div className="text-[11px] text-muted-foreground">{t("common.entries", { n: total })}</div>
    );
  }

  const btn =
    "h-7 px-2.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        className={btn}
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-muted-foreground">
        {t("common.pageOf", { page, total: totalPages })}
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-muted-foreground">· {t("common.entries", { n: total })}</span>
    </div>
  );
}