"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <div className="text-[11px] text-[#8FAF9A]">{total} entrée{total === 1 ? "" : "s"}</div>
    );
  }

  const btn =
    "h-7 px-2.5 rounded-md border border-[#D6E8DC] text-[11px] font-medium text-[#5A7A65] hover:bg-[#F0F7F3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

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
      <span className="text-[11px] text-[#5A7A65]">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-[#8FAF9A]">· {total} entrée{total === 1 ? "" : "s"}</span>
    </div>
  );
}