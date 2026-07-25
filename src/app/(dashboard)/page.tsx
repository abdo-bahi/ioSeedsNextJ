import {KPIGrid} from "@/components/dashboard/KPIGrid";
import { getAllWilayas } from "@/dal/wilaya.dal";

export default async function Dashboard() {
  // const wilayas = await getAllWilayas();
  return (
    <div >
    <KPIGrid/>
    </div>
  );
}
