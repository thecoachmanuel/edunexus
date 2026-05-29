"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { useSidebar } from "@/components/ui/sidebar";
import { sidebardata } from "@/components/sidebar/AppSidebar";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/** Derives a readable page title from the current pathname using sidebar nav data */
function usePageTitle(): string {
  const pathname = usePathname();

  for (const section of sidebardata.navMain) {
    if (section.url === pathname) return section.title;
    for (const sub of section.items ?? []) {
      if (sub.url === pathname) return sub.title;
    }
  }

  // Fallback: capitalise the last segment of the path
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "Dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function MobileTopbar() {
  const { openMobile, setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const pageTitle = usePageTitle();

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header
      className={cn(
        // Only visible on mobile
        "md:hidden",
        "fixed top-0 left-0 right-0 z-50",
        "h-14 flex items-center justify-between px-4",
        "bg-background/80 backdrop-blur-md border-b border-border/60",
        "shadow-sm",
      )}
    >
      {/* Hamburger / Close toggle */}
      <button
        aria-label="Toggle navigation"
        onClick={() => setOpenMobile(!openMobile)}
        className={cn(
          "relative h-9 w-9 flex items-center justify-center rounded-xl",
          "bg-primary/10 text-primary",
          "hover:bg-primary/20 active:scale-95",
          "transition-all duration-200",
        )}
      >
        <span
          className={cn(
            "absolute transition-all duration-300",
            openMobile ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75",
          )}
        >
          <X className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "absolute transition-all duration-300",
            openMobile ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100",
          )}
        >
          <Menu className="h-5 w-5" />
        </span>
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold tracking-tight text-foreground truncate mx-3 flex-1 text-center">
        {pageTitle}
      </h1>

      {/* Notification Bell + User avatar */}
      <div className="flex items-center gap-1 shrink-0">
        <NotificationBell />
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary to-primary/70",
            "text-primary-foreground text-xs font-bold",
            "shadow-sm select-none",
          )}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
