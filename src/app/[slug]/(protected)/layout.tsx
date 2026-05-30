"use client";

import { useAuth } from "@/hooks/AuthProvider";
import { useRouter, usePathname, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { MobileTopbar } from "@/components/sidebar/MobileTopbar";
import { useEffect } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, year } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(`/${params.slug}/login`);
      } else if (!year) {
        if (user.role === "admin") {
          if (pathname !== `/${params.slug}/settings/academic-years`) {
            toast.warning("Please configure an active Academic Year first.");
            router.replace(`/${params.slug}/settings/academic-years`);
          }
        } else {
          router.replace(`/${params.slug}/login`);
        }
      }
    }
  }, [loading, user, year, pathname, router, params.slug]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!year && user.role !== "admin")) {
    return null; // Will redirect in useEffect
  }

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

