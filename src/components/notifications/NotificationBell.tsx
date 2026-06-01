"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface Notification {
  _id: string;
  action: string;
  details?: string;
  actor: string;
  actorRole: string;
  createdAt: string;
}

function roleColor(role: string) {
  switch (role) {
    case "admin": return "bg-purple-500";
    case "teacher": return "bg-blue-500";
    case "student": return "bg-emerald-500";
    default: return "bg-gray-400";
  }
}

function actionIcon(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("quiz") || a.includes("exam")) return "📝";
  if (a.includes("attendance")) return "📋";
  if (a.includes("fee") || a.includes("salary") || a.includes("expense")) return "💰";
  if (a.includes("student") || a.includes("user") || a.includes("register")) return "👤";
  if (a.includes("timetable")) return "📅";
  if (a.includes("report")) return "📊";
  if (a.includes("material")) return "📚";
  if (a.includes("class")) return "🏫";
  return "🔔";
}

export function NotificationBell() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem("notif_read") || "[]"));
    } catch {
      return new Set();
    }
  });

  const { data, isLoading } = useSWR("/notifications", {
    refreshInterval: 30000, // Poll every 30s for new notifications
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !readIds.has(n._id)).length;

  // Mark all as read when panel is opened
  const handleOpen = () => {
    setOpen(true);
    if (notifications.length > 0) {
      const allIds = notifications.map((n) => n._id);
      const newSet = new Set([...readIds, ...allIds]);
      setReadIds(newSet);
      localStorage.setItem("notif_read", JSON.stringify([...newSet]));
    }
  };

  // No need for custom click outside handler with Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label="Notifications"
        className={cn(
          "relative h-9 w-9 flex items-center justify-center rounded-xl",
          "hover:bg-primary/10 active:scale-95 transition-all duration-200",
          open && "bg-primary/10"
        )}
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      </PopoverTrigger>

      <PopoverContent
        align={isMobile ? "center" : "start"}
        side={isMobile ? "bottom" : "right"}
        sideOffset={isMobile ? 12 : 4}
        className="w-[calc(100vw-32px)] sm:w-[380px] p-0 flex flex-col overflow-hidden border-border rounded-2xl shadow-2xl"
      >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {notifications.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[420px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <CheckCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/70 mt-1">No recent activity to show.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <li
                    key={n._id}
                    className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Emoji icon */}
                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-lg select-none">
                      {actionIcon(n.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug truncate">{n.action}</p>
                      {n.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.details}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            roleColor(n.actorRole)
                          )}
                        />
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {n.actor}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 ml-auto whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                Showing last {notifications.length} activities · Auto-refreshes every 30s
              </p>
            </div>
          )}
      </PopoverContent>
    </Popover>
  );
}
