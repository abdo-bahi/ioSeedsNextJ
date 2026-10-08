"use client"

import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"

/**
 * Resolves the current user's permissions for a functionality on the
 * selected irrigation field. Returns all-false while no field is selected.
 *
 * Usage:
 *   const perms = usePermissions("actuator")
 *   {perms.canToggle && <button ...>}
 */
export function usePermissions(functionality: string) {
  const { selectedField } = useFieldStore()

  const { data } = trpc.rbac.getMyPermissions.useQuery(
    {
      irrigationFieldId: selectedField?.id ?? "",
      functionality,
    },
    { enabled: !!selectedField?.id }
  )

  return {
    canRead:   data?.canRead ?? false,
    canCreate: data?.canCreate ?? false,
    canUpdate: data?.canUpdate ?? false,
    canDelete: data?.canDelete ?? false,
    canToggle: data?.canToggle ?? false,
  }
}