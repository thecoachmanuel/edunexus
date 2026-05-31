"use client";

import { useAuth } from "@/hooks/AuthProvider";
import { useRouter, usePathname, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { MobileTopbar } from "@/components/sidebar/MobileTopbar";
import { useEffect } from "react";
import axios from "axios";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, year } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const urlSlug = params.slug as string;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // No session — go to this slug's login page
      router.replace(`/${urlSlug}`);
      return;
    }

    // ─── TENANT ISOLATION CHECK ────────────────────────────────────────────────
    // If the authenticated user belongs to a DIFFERENT school, force-logout and
    // redirect to the requested school's login page so they can authenticate
    // with the correct credentials. This prevents cross-tenant data leakage.
    const userSchoolSlug = user?.schoolContext?.slug;
    if (userSchoolSlug && userSchoolSlug !== urlSlug) {
      axios.post("/api/users/logout").catch(() => {}).finally(() => {
        toast.error("Session mismatch. Please log in to this school portal.");
        router.replace(`/${urlSlug}`);
      });
      return;
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Academic year guard — admins must configure a year before anything works
    if (!year) {
      if (user.role === "admin") {
        if (pathname !== `/${urlSlug}/settings/academic-years`) {
          toast.warning("Please configure an active Academic Year first.");
          router.replace(`/${urlSlug}/settings/academic-years`);
        }
      } else {
        router.replace(`/${urlSlug}/login`);
      }
    }
  }, [loading, user, year, pathname, router, urlSlug]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  if (!year && user.role !== "admin") return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile-only sticky top bar with hamburger + page title */}
        <MobileTopbar />
        {/* Push content below the mobile topbar (h-14) only on mobile */}
        <div className="pt-14 md:pt-0 flex flex-col flex-1 min-h-0 overflow-x-hidden w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
