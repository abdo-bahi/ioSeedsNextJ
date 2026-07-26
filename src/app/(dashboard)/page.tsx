import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ActuatorPanel } from "@/components/dashboard/ActuatorPanel";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { getAllWilayas } from "@/dal/wilaya.dal";

export default async function Dashboard() {
  // const wilayas = await getAllWilayas();
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <KPIGrid />

      {/* Bottom row — actuators + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActuatorPanel />
        <ActivityFeed />
      </div>
    </div>
  );
}
