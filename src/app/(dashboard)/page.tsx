import { getAllWilayas } from "@/dal/wilaya.dal";

export default async function Dashboard() {
  const wilayas = await getAllWilayas();
  return (
    <div >
      <h1>Dashboard : </h1>
      <h1>here are wilayas from DB : </h1>
    <ul>
      {wilayas?.map((w) => {
        return <li key={w.id}>{w.name} - {w.code}</li>
      })}
    </ul>
    </div>
  );
}
