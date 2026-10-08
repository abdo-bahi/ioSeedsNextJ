// src/components/dashboard/ActuatorPanel.tsx
"use client"

import { Power } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useFieldStore } from "@/store/field-store"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSSE } from "@/lib/use-sse"
import { t } from "@/i18n"

function ActuatorSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border animate-pulse">
      <div className="h-8 w-8 rounded-full bg-green-soft" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-green-soft rounded mb-1" />
        <div className="h-2 w-16 bg-green-soft rounded" />
      </div>
      <div className="h-8 w-16 bg-green-soft rounded" />
    </div>
  )
}

export function ActuatorPanel() {
  const { selectedField } = useFieldStore()
  const queryClient = trpc.useUtils();
  const { canToggle } = usePermissions("actuator")

  const { data: actuators, isLoading } = trpc.actuator.getAllByField.useQuery(
    { irrigationFieldId: selectedField?.id ?? "" },
    {
      enabled:         !!selectedField?.id,
    }
  )

  const toggle = trpc.actuator.toggle.useMutation({
    onSuccess: () => {
      // Refetch actuators after toggle
      queryClient.actuator.getAllByField.invalidate()
      queryClient.activity.getRecentByField.invalidate()
    }
  })

  useSSE({
    connected: () => {
      console.log("🟢 SSE INITIALIZED")
    },
    actuator_state: () => {
      queryClient.actuator.getAllByField.invalidate({
        irrigationFieldId: selectedField?.id ?? "",
      })
    },
    device_status: () => {
      queryClient.actuator.getAllByField.invalidate({
        irrigationFieldId: selectedField?.id ?? "",
      })
    },
  })



  return (
    <div className="bg-card border border-border rounded-xl p-4">

      {/* Header */}
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
        {t("dashboard.actuators.quickActions")}
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
          <p className="text-[12px] text-muted-foreground text-center py-4">
            {t("dashboard.actuators.empty")}
          </p>
        )}

        {actuators?.map((actuator) => {
          // Real state from last action
          const isOpen      = actuator?.targetState
          const isToggling  = toggle.isPending

          return (
            <div
              key={actuator.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-canvas transition-colors"
            >
              {/* Power icon */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isOpen ? "bg-[#E6F7ED]" : "bg-muted"
              }`}>
                <Power className={`h-4 w-4 ${
                  isOpen ? "text-primary" : "text-muted-foreground"
                }`} />
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {actuator.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {actuator.actuatorType?.name ?? "—"}
                </p>
              </div>

              {/* Status badge */}
              <Badge
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 ${
                  isOpen
                    ? "bg-[#E6F7ED] text-[#2D8653]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isOpen ? t("dashboard.actuators.state.open") : t("dashboard.actuators.state.closed")}
              </Badge>

              {/* Toggle button */}
              {canToggle && (
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
                      : "border-primary text-primary hover:bg-[#E6F7ED]"
                  }`}
                >
                  {isOpen ? t("dashboard.actuators.close") : t("dashboard.actuators.open")}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}