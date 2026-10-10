"use client"

import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"

export function AppInitializer() {
  const { data: session } = authClient.useSession()
  const { selectedField, setField, setFields } = useFieldStore()

  const {
    data: fields,
  } = trpc.rbac.getMyFields.useQuery(undefined, {
    enabled: !!session?.user.id,
  });

  useEffect(() => {
    if (!fields || fields.length === 0) return
    const mapped = fields.map(f => ({
      id:   f.id,
      name: f.name ?? "Unnamed field",
      fk_FarmingUnit: f.fk_FarmingUnit ?? null,
    }))
    setFields(mapped)
    const persisted = mapped.find(f => f.id === selectedField?.id);
    setField(persisted ?? mapped[0]);
  }, [fields])

  return null
}