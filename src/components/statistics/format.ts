// src/components/statistics/format.ts
import { t } from "@/i18n"

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s <= 0) return t("statistics.duration.zero")
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${t("statistics.duration.days", { n: d })} ${t("statistics.duration.hours", { n: h })}`
  if (h) return m ? `${t("statistics.duration.hours", { n: h })} ${t("statistics.duration.minutes", { n: m })}` : t("statistics.duration.hours", { n: h })
  return t("statistics.duration.minutes", { n: m })
}

export function fmtMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

export function fmtMinutes1(ms: number): number {
  return Math.round((ms / 60000) * 10) / 10
}

export function fmtDurationShort(ms: number): string {
  const m = fmtMinutes(ms)
  if (m === 0) return "0"
  return t("statistics.duration.minutes", { n: m })
}