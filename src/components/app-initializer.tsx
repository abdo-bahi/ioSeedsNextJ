"use client"

import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"

export function AppInitializer() {
  const { data: session } = authClient.useSession()
  const { selectedField, setField, setFields } = useFieldStore()

  const farmId = session?.user?.fk_farm ?? ""

  const { data: fields } = trpc.irrigationField.getAllByFarm.useQuery(
    { farmId },
    { enabled: !!farmId }
  )

  useEffect(() => {
    if (!fields || fields.length === 0) return
    const mapped = fields.map(f => ({
      id:   f.id,
      name: f.name ?? "Unnamed field",
    }))
    setFields(mapped)
    if (!selectedField) setField(mapped[0])
  }, [fields])

  return null
}