// src/components/dashboard/ActuatorPanel.tsx
"use client"

import { Power } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function ActuatorSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#D6E8DC] animate-pulse">
      <div className="h-8 w-8 rounded-full bg-[#E8F4ED]" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-[#E8F4ED] rounded mb-1" />
        <div className="h-2 w-16 bg-[#E8F4ED] rounded" />
      </div>
      <div className="h-8 w-16 bg-[#E8F4ED] rounded" />
    </div>
  )
}

export function ActuatorPanel() {
  const { selectedField } = useFieldStore()
  const utils = trpc.useUtils()

  const { data: actuators, isLoading } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    {
      enabled:         !!selectedField?.id,
      refetchInterval: 15000,
    }
  )

  const toggle = trpc.actuator.toggle.useMutation({
    onSuccess: () => {
      // Refetch actuators after toggle
      utils.actuator.getAllByField.invalidate()
      utils.activity.getRecentByField.invalidate()
    }
  })

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-4">

      {/* Header */}
      <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase mb-3">
        Actions Rapides
      </p>

      {/* List */}
      <div className="flex flex-col gap-2">
        {isLoading && (
          <>
            <ActuatorSkeleton />
            <ActuatorSkeleton />
          </>
        )}

        {!isLoading && (!actuators || actuators.length === 0) && (
          <p className="text-[12px] text-[#8FAF9A] text-center py-4">
            Aucun actionneur trouvé
          </p>
        )}

        {actuators?.map((actuator:any) => {
          // Real state from last action
          const lastAction  = actuator.actions[0]
          const isOpen      = lastAction?.actionVal ?? actuator.targetState
          const isToggling  = toggle.isPending

          return (
            <div
              key={actuator.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#D6E8DC] hover:bg-[#F7F9F5] transition-colors"
            >
              {/* Power icon */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isOpen ? "bg-[#E6F7ED]" : "bg-[#F5F5F5]"
              }`}>
                <Power className={`h-4 w-4 ${
                  isOpen ? "text-[#4CAF7D]" : "text-[#8FAF9A]"
                }`} />
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A2E22] truncate">
                  {actuator.name}
                </p>
                <p className="text-[11px] text-[#8FAF9A]">
                  {actuator.actuatorType?.name ?? "—"}
                </p>
              </div>

              {/* Status badge */}
              <Badge
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 ${
                  isOpen
                    ? "bg-[#E6F7ED] text-[#2D8653]"
                    : "bg-[#F5F5F5] text-[#888]"
                }`}
              >
                {isOpen ? "Open" : "Closed"}
              </Badge>

              {/* Toggle button */}
              <Button
                size="sm"
                variant="outline"
                disabled={isToggling || !actuator.isActive}
                onClick={() => toggle.mutate({
                  actuatorId: actuator.id,
                  newState:   !isOpen,
                })}
                className={`text-[12px] h-8 px-3 border transition-colors ${
                  isOpen
                    ? "border-[#D95F5F] text-[#D95F5F] hover:bg-[#FDEAEA]"
                    : "border-[#4CAF7D] text-[#4CAF7D] hover:bg-[#E6F7ED]"
                }`}
              >
                {isOpen ? "Fermer" : "Ouvrir"}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}