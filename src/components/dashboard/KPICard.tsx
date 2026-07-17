import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

type KPICardProps = {
  title:    string
  value:    string
  subtitle: string
  icon:     LucideIcon
  color:    "green" | "amber" | "red" | "blue"
}

// ── Safe color map — Tailwind needs full class strings, not dynamic ones
const colorMap = {
  green: {
    border:  "border-t-[#4CAF7D]",
    icon:    "text-[#4CAF7D]",
    value:   "text-[#1A3C2E]",
  },
  amber: {
    border:  "border-t-[#E89B2D]",
    icon:    "text-[#E89B2D]",
    value:   "text-[#E89B2D]",
  },
  red: {
    border:  "border-t-[#D95F5F]",
    icon:    "text-[#D95F5F]",
    value:   "text-[#D95F5F]",
  },
  blue: {
    border:  "border-t-[#6BA3D6]",
    icon:    "text-[#6BA3D6]",
    value:   "text-[#1A3C2E]",
  },
}

export function KPICard({ title, value, subtitle, icon: Icon, color }: KPICardProps) {
  const c = colorMap[color]

  return (
    <Card className={`border-t-4 ${c.border} rounded-xl shadow-none`}>
      <CardContent className="pt-5 pb-5 px-5">

        {/* Title + icon row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-wider text-[#8FAF9A] uppercase">
            {title}
          </p>
          <Icon className={`h-[18px] w-[18px] ${c.icon}`} />
        </div>

        {/* Value */}
        <p className={`text-[2rem] font-bold leading-none mb-1 ${c.value}`}>
          {value}
        </p>

        {/* Subtitle */}
        <p className="text-[12px] text-[#8FAF9A] mt-2">
          {subtitle}
        </p>

      </CardContent>
    </Card>
  )
}