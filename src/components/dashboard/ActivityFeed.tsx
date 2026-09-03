// src/components/dashboard/ActivityFeed.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { useFieldStore } from "@/store/field-store";

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed() {
  const { selectedField } = useFieldStore();

  const { data: activities, isLoading } =
    trpc.activity.getRecentByField.useQuery(
      { irrigationFieldId: selectedField?.id ?? "", limit: 8 },
      {
        enabled: !!selectedField?.id,
        refetchInterval: 10000,
      }
    );

  return (
    <div className="bg-white border border-[#D6E8DC] rounded-xl p-4">
      {/* Header */}
      <p className="text-[10px] font-semibold tracking-widest text-[#8FAF9A] uppercase mb-3">
        Activité Récente
      </p>

      {/* List */}
      <div className="flex flex-col gap-0">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-[#E8F4ED] mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-48 bg-[#E8F4ED] rounded mb-1" />
                  <div className="h-2 w-20 bg-[#E8F4ED] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!activities || activities.length === 0) && (
          <p className="text-[12px] text-[#8FAF9A] text-center py-4">
            Aucune activité récente
          </p>
        )}

        {activities?.map((activity: any, index: any) => (
          <div
            key={activity.id}
            className={`flex gap-3 py-2.5 ${
              index < activities.length - 1 ? "border-b border-[#F0F7F3]" : ""
            }`}
          >
            {/* Dot */}
            <div
              className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                activity.isOpen ? "bg-[#4CAF7D]" : "bg-[#8FAF9A]"
              }`}
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#1A2E22] leading-snug">
                {activity.label}
                {activity.sublabel && (
                  <span className="text-[#8FAF9A]"> — {activity.sublabel}</span>
                )}
              </p>

              {/* Who made the action + type */}
              <p className="text-[11px] text-[#8FAF9A] mt-0.5">
                {(activity.isMcuAction)
                  ? `${activity.mcu ?? "MCU"} (Auto)`
                  : `${activity.user ?? "Unknown"} (Manual)`}
              </p>

              <p className="text-[11px] text-[#8FAF9A] mt-0.5">
                {formatRelative(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
