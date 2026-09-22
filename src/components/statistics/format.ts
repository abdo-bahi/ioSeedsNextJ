// src/components/statistics/format.ts
export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s <= 0) return "0 min"
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${d}j ${h}h`
  if (h) return m ? `${h}h ${m}min` : `${h}h`
  return `${m}min`
}

export function fmtMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

export function fmtDurationShort(ms: number): string {
  const m = fmtMinutes(ms)
  if (m === 0) return "0"
  return `${m}min`
}