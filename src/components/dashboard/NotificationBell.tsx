"use client"

import { useState } from "react"
import { Bell, Check, CheckCheck } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useSSE } from "@/lib/use-sse"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

function formatRelative(date: Date | string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

export function NotificationBell({ userId }: { userId: string }) {
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)

  const { data: notifications } = trpc.notification.getUnread.useQuery()

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => utils.notification.getUnread.invalidate(),
  })
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => utils.notification.getUnread.invalidate(),
  })

  // Live push via SSE
  useSSE({
    notification: (data) => {
      const d = data as { userId?: string }
      if (d?.userId === userId) {
        utils.notification.getUnread.invalidate()
      }
    },
  })

  const count = notifications?.length ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-[36px] w-[36px] text-[#8FAF9A] hover:text-[#4CAF7D] hover:bg-[#E8F4ED]"
          />
        }
      >
        <Bell className="h-[16px] w-[16px]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-[16px] w-[16px] rounded-full bg-[#D95F5F] text-white text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D6E8DC]">
          <p className="text-[14px] font-semibold text-[#1A2E22]">
            Notifications
            {count > 0 && (
              <span className="ml-2 text-[11px] bg-[#D95F5F] text-white px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </p>
          {count > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] text-[#4CAF7D] hover:text-[#2D8653] flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Tout lire
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto">
          {(notifications?.length === 0 || !notifications) && (
            <div className="px-4 py-8 text-center text-[13px] text-[#8FAF9A]">
              Aucune notification
            </div>
          )}

          {notifications?.map(n => (
            <div
              key={n.id}
              className="flex gap-3 px-4 py-3 border-b border-[#F0F7F3] hover:bg-[#F7F9F5] cursor-pointer"
              onClick={() => markRead.mutate({ id: n.id })}
            >
              <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                n.type === "MIN_THRESHOLD" || n.type === "MAX_THRESHOLD"
                  ? "bg-[#E89B2D]"
                  : n.type === "MCU_INACTIVE" || n.type === "DEVICE_INACTIVE"
                    ? "bg-[#D95F5F]"
                    : "bg-[#4CAF7D]"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A2E22]">
                  {n.title}
                </p>
                <p className="text-[11px] text-[#5A7A65] mt-0.5">
                  {n.message}
                </p>
                <p className="text-[10px] text-[#8FAF9A] mt-1">
                  {formatRelative(n.createdAt)} ago
                </p>
              </div>
              <Check className="h-3.5 w-3.5 text-[#8FAF9A] flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>

      </PopoverContent>
    </Popover>
  )
}