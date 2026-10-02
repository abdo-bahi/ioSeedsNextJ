import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListChecks, LucideIcon } from "lucide-react"

type KPICardProps = {
  title:    string
  value:    string
  subtitle: string
  icon:     LucideIcon
  color:    "green" | "amber" | "red" | "blue"
  onDetails?: () => void
}

// ── Safe color map — Tailwind needs full class strings, not dynamic ones
const colorMap = {
  green: {
    border:  "border-t-[#4CAF7D]",
    icon:    "text-primary",
    value:   "text-foreground",
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
    value:   "text-foreground",
  },
}

export function KPICard({ title, value, subtitle, icon: Icon, color, onDetails }: KPICardProps) {
  const c = colorMap[color]

  return (
    <Card className={`border-t-4 ${c.border} rounded-xl shadow-none`}>
      <CardContent className="pt-5 pb-5 px-5">

        {/* Title + icon row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </p>
          <Icon className={`h-[18px] w-[18px] ${c.icon}`} />
        </div>

        {/* Value */}
        <p className={`text-[2rem] font-bold leading-none mb-1 ${c.value}`}>
          {value}
        </p>

        {/* Footer — subtitle + optional details button */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-[12px] text-muted-foreground">
            {subtitle}
          </p>
          {onDetails && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDetails}
              className="h-6 px-2 text-[10px] font-semibold text-primary hover:text-[#2D8653] hover:bg-[#E6F7ED] rounded-md"
            >
              <ListChecks className="h-3 w-3 mr-1" />
              Détails
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  )
}