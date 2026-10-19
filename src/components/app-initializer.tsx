"use client"

import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"

export function AppInitializer() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  const {
    data: fields,
  } = trpc.rbac.getMyFields.useQuery(undefined, {
    enabled: !!userId,
  });

  // The farm the logged-in user is assigned to (their `fk_farm`) — the landing
  // context right after signing in.
  const { data: myFarmId } = trpc.user.myFarm.useQuery(undefined, {
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId || !fields) return

    const store = useFieldStore.getState()

    // A different user is now signed in → drop the previous session's context.
    const userChanged = store.ownerId !== userId

    if (fields.length === 0) {
      store.reset()
      store.setOwner(userId)
      return
    }

    const mapped = fields.map(f => ({
      id:   f.id,
      name: f.name ?? "Unnamed field",
      fk_FarmingUnit: f.fk_FarmingUnit ?? null,
    }))

    const farmIds = new Set(mapped.map(f => f.fk_FarmingUnit))
    const persistedFarmId = userChanged ? null : store.activeFarmId
    const persistedField = userChanged ? null : store.selectedField

    // Priority: the farm the user was explicitly viewing → the farm they are
    // assigned to (fk_farm) → the persisted selection's farm → first available.
    const farmId =
      persistedFarmId && farmIds.has(persistedFarmId)
        ? persistedFarmId
        : myFarmId && farmIds.has(myFarmId)
          ? myFarmId
          : mapped.find(f => f.id === persistedField?.id)?.fk_FarmingUnit
            ?? mapped[0]?.fk_FarmingUnit
            ?? null

    // The topbar selector only ever exposes parcelles of the active farm.
    const scoped = mapped.filter(f => f.fk_FarmingUnit === farmId)
    const next = scoped.find(f => f.id === persistedField?.id) ?? scoped[0] ?? null

    store.setOwner(userId)
    store.setActiveFarmId(farmId)
    store.setFields(scoped)
    store.setField(next)
  }, [userId, fields, myFarmId])

  return null
}
