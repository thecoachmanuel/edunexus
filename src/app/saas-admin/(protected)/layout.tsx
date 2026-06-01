"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2, Ticket, BarChart3, Shield, LogOut, X, Menu, CreditCard, Users, Settings, Receipt
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", href: "/saas-admin/dashboard", label: "Overview", icon: BarChart3 },
  { id: "schools", href: "/saas-admin/schools", label: "Schools", icon: Building2 },
  { id: "transactions", href: "/saas-admin/transactions", label: "Transactions", icon: Receipt },
  { id: "plans", href: "/saas-admin/plans", label: "Plans", icon: CreditCard },
  { id: "support", href: "/saas-admin/support", label: "Support", icon: Ticket },
  { id: "users", href: "/saas-admin/users", label: "Users", icon: Users },
  { id: "settings", href: "/saas-admin/settings", label: "Settings", icon: Settings },
];

export default function SaasAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [escalatedCount, setEscalatedCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false); // Close sidebar on route change on mobile
  }, [pathname]);

  // Fetch ticket count for the badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get("/api/superadmin/tickets");
        setEscalatedCount(res.data.tickets.filter((t: any) => t.status === "escalated").length);
      } catch (err) {}
    };
    fetchCount();
  }, []);

  const handleSignOut = async () => {
    await axios.post("/api/superadmin/auth/logout").catch(() => {});
    router.push("/saas-admin/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* === MOBILE SIDEBAR OVERLAY === */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* === SIDEBAR === */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-60 border-r border-foreground/5 bg-card flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <Link href="/saas-admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">EduNexus</div>
              <div className="text-[10px] text-foreground/30">Admin Console</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/30 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {item.id === "support" && escalatedCount > 0 && (
                  <span className="ml-auto text-[10px] bg-amber-500 text-black font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {escalatedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main className="lg:ml-60 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-foreground/5 bg-background/90 backdrop-blur-xl px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-sm sm:text-base capitalize">
              {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>

        {/* === MOBILE BOTTOM NAV === */}
        <nav className="lg:hidden sticky bottom-0 z-30 border-t border-foreground/5 bg-background/95 backdrop-blur-xl flex overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors relative ${
                  isActive ? "text-violet-400" : "text-white/30"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="truncate w-full text-center">{item.label}</span>
                {item.id === "support" && escalatedCount > 0 && (
                  <span className="absolute top-2 right-1/4 translate-x-1/2 text-[9px] bg-amber-500 text-black font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {escalatedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
