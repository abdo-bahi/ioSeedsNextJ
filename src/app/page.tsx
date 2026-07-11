import Image from "next/image";
import { getAllWilayas } from "@/dal/wilaya.dal";

export default async function Home() {
  const wilayas = await getAllWilayas();
  return (
    <div>
      <h1>here are wilayas : </h1>
    <ul>
      {wilayas?.map((w) => {
        return <li key={w.id}>{w.name} - {w.code}</li>
      })}
    </ul>
    </div>
  );
}
