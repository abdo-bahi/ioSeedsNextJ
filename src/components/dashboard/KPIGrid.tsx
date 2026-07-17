import { Wifi, Droplets, Thermometer, TriangleAlert } from "lucide-react"
import { KPICard } from "@/components/dashboard/KPICard"

export function KPIGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="MCUs Actifs"
        value="2/2"
        subtitle="dans cette parcelle"
        icon={Wifi}
        color="green"
      />
      <KPICard
        title="Humidité Moy."
        value="71%"
        subtitle="tous capteurs"
        icon={Droplets}
        color="green"
      />
      <KPICard
        title="Température Moy."
        value="28.8°C"
        subtitle="capteurs actifs"
        icon={Thermometer}
        color="amber"
      />
      <KPICard
        title="Alertes Actives"
        value="0"
        subtitle="Tout est normal"
        icon={TriangleAlert}
        color="green"
      />
    </div>
  )
}