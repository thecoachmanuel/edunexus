"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, DollarSign, ArrowUpRight, Search, Shield, LogOut,
  ToggleLeft, ToggleRight, ExternalLink, Ticket,
  BarChart3, Bot, Menu, X,
} from "lucide-react";

interface Stats {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  pastDueSchools: number;
  totalRevenueKobo: number;
  totalUsers: number;
}

interface School {
  _id: string;
  name: string;
  slug: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  isTrialActive: boolean;
  createdAt: string;
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
    plan?: { name: string };
  };
}

interface AdminTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  lastActivityAt: string;
  school: { name: string; slug: string };
}

type Tab = "overview" | "schools" | "support";

const NAV_ITEMS = [
  { id: "overview" as Tab, label: "Overview", icon: BarChart3 },
  { id: "schools" as Tab, label: "Schools", icon: Building2 },
  { id: "support" as Tab, label: "Support", icon: Ticket },
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [allTickets, setAllTickets] = useState<AdminTicket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overview, schools, ticketsRes] = await Promise.all([
          axios.get("/api/superadmin/overview"),
          axios.get("/api/superadmin/schools"),
          axios.get("/api/superadmin/tickets"),
        ]);
        setStats(overview.data.stats);
        setRecentSchools(overview.data.recentSchools);
        setAllSchools(schools.data.schools);
        setAllTickets(ticketsRes.data.tickets);
      } catch (err: any) {
        if (err.response?.status === 401) router.push("/saas-admin/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleToggleActive = async (schoolId: string) => {
    try {
      await axios.patch(`/api/superadmin/schools/${schoolId}`, { action: "toggle_active" });
      setAllSchools((s) =>
        s.map((sc) => (sc._id === schoolId ? { ...sc, isActive: !sc.isActive } : sc))
      );
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleExtendTrial = async (schoolId: string, days: number) => {
    try {
      await axios.patch(`/api/superadmin/schools/${schoolId}`, {
        action: "extend_trial",
        trialDays: days,
      });
      alert(`Trial extended by ${days} days`);
    } catch (err) {
      console.error("Extend trial failed:", err);
    }
  };

  const handleSignOut = async () => {
    await axios.post("/api/superadmin/auth/logout").catch(() => {});
    router.push("/saas-admin/login");
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(kobo / 100);

  const filteredSchools = allSchools.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.includes(search.toLowerCase()) ||
      s.email.includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      trialing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      past_due: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
      expired: "bg-red-500/15 text-red-400 border-red-500/20",
    };
    return map[status] || "bg-white/10 text-white/50 border-white/10";
  };

  const ticketStatusBadge = (status: string) => {
    if (status === "escalated")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium whitespace-nowrap">Escalated</span>;
    if (status === "ai_handling")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium whitespace-nowrap">AI Agent</span>;
    if (status === "open")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-medium whitespace-nowrap">Open</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium whitespace-nowrap capitalize">{status}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060610] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading EduNexus Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060610] text-white">
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
          fixed top-0 bottom-0 left-0 z-50 w-60 border-r border-white/5 bg-[#0a0a18] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">EduNexus</div>
              <div className="text-[10px] text-white/30">Admin Console</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/30 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {item.id === "support" && allTickets.filter((t) => t.status === "escalated").length > 0 && (
                <span className="ml-auto text-[10px] bg-amber-500 text-black font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {allTickets.filter((t) => t.status === "escalated").length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign Out */}
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
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#060610]/90 backdrop-blur-xl px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-sm sm:text-base capitalize">
              {activeTab === "overview"
                ? "Dashboard"
                : activeTab === "schools"
                ? "School Management"
                : "Support Tickets"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Escalated badge on mobile */}
            {allTickets.filter((t) => t.status === "escalated").length > 0 && (
              <button
                onClick={() => handleTabChange("support")}
                className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-lg"
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {allTickets.filter((t) => t.status === "escalated").length} Escalated
                </span>
                <span className="sm:hidden font-bold">
                  {allTickets.filter((t) => t.status === "escalated").length}
                </span>
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">

          {/* === OVERVIEW TAB === */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              {/* Stat Cards — 2 cols on mobile, 3 on sm, 6 on xl */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                {[
                  { label: "Total Schools", value: stats.totalSchools, icon: Building2, color: "violet" },
                  { label: "Active", value: stats.activeSchools, icon: CheckCircle2, color: "emerald" },
                  { label: "Trialing", value: stats.trialSchools, icon: Clock, color: "blue" },
                  { label: "Past Due", value: stats.pastDueSchools, icon: AlertTriangle, color: "amber" },
                  { label: "Total Users", value: stats.totalUsers, icon: Users, color: "indigo" },
                  { label: "Revenue", value: formatNGN(stats.totalRevenueKobo), icon: DollarSign, color: "emerald" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 sm:p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-2 sm:mb-3 text-${stat.color}-400`} />
                    <div className="text-xl sm:text-2xl font-black leading-tight">{stat.value}</div>
                    <div className="text-[11px] sm:text-xs text-white/40 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Schools — Card layout on mobile, table on sm+ */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-bold text-sm sm:text-base">Recently Onboarded</h2>
                  <button
                    onClick={() => setActiveTab("schools")}
                    className="text-xs text-violet-400 hover:underline flex items-center gap-1"
                  >
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Mobile: cards */}
                <div className="sm:hidden divide-y divide-white/5">
                  {recentSchools.map((school: any) => (
                    <div key={school._id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm">{school.name}</div>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(school.subscription?.status || "unknown")}`}>
                          {school.subscription?.status || "No sub"}
                        </span>
                      </div>
                      <div className="text-white/40 text-xs font-mono">{school.slug}</div>
                      <div className="text-white/30 text-xs">{school.email}</div>
                    </div>
                  ))}
                </div>

                {/* Desktop: list */}
                <div className="hidden sm:block divide-y divide-white/5">
                  {recentSchools.map((school: any) => (
                    <div key={school._id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{school.name}</div>
                        <div className="text-white/40 text-xs mt-0.5">{school.slug} · {school.email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge(school.subscription?.status || "unknown")}`}>
                          {school.subscription?.status || "No sub"}
                        </span>
                        <span className="text-white/30 text-xs">{school.subscription?.plan?.name || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === SCHOOLS TAB === */}
          {activeTab === "schools" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search schools..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
                <span className="text-white/40 text-sm whitespace-nowrap">{filteredSchools.length} schools</span>
              </div>

              {/* Mobile: Card list */}
              <div className="sm:hidden space-y-3">
                {filteredSchools.map((school) => (
                  <div key={school._id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
                    {/* School header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm">{school.name}</div>
                        <div className="text-white/30 text-xs font-mono mt-0.5">/{school.slug}</div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(school._id)}
                        title={school.isActive ? "Deactivate" : "Activate"}
                      >
                        {school.isActive
                          ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                          : <ToggleLeft className="w-6 h-6 text-white/30" />}
                      </button>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(school.subscription?.status || "unknown")}`}>
                        {school.subscription?.status || "—"}
                      </span>
                      {school.subscription?.plan?.name && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40">
                          {school.subscription.plan.name}
                        </span>
                      )}
                      {school.isTrialActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/20 text-blue-400 bg-blue-500/10">
                          Trial Active
                        </span>
                      )}
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleExtendTrial(school._id, 14)}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all font-medium"
                      >
                        +14d Trial
                      </button>
                      <Link
                        href={`/${school.slug}/login`}
                        target="_blank"
                        className="flex items-center justify-center gap-1.5 flex-1 text-xs px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Portal
                      </Link>
                    </div>
                  </div>
                ))}
                {filteredSchools.length === 0 && (
                  <div className="text-center py-12 text-white/30 text-sm">No schools found.</div>
                )}
              </div>

              {/* Desktop: Table */}
              <div className="hidden sm:block rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left">
                        {["School", "Plan", "Status", "Trial", "Toggle", "Actions"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {filteredSchools.map((school) => (
                        <tr key={school._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-sm">{school.name}</div>
                            <div className="text-white/30 text-xs mt-0.5 font-mono">/{school.slug}</div>
                          </td>
                          <td className="px-5 py-4 text-sm text-white/60 whitespace-nowrap">
                            {school.subscription?.plan?.name || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${statusBadge(school.subscription?.status || "unknown")}`}>
                              {school.subscription?.status || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {school.isTrialActive ? (
                              <span className="text-blue-400">Active</span>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleToggleActive(school._id)}
                              title={school.isActive ? "Deactivate" : "Activate"}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              {school.isActive
                                ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                                : <ToggleLeft className="w-5 h-5" />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/${school.slug}/login`}
                                target="_blank"
                                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                title="Open school"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleExtendTrial(school._id, 14)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all whitespace-nowrap"
                              >
                                +14d Trial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredSchools.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-10 text-white/30">No schools found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === SUPPORT TAB === */}
          {activeTab === "support" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats bar */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {allTickets.filter((t) => t.status === "escalated").length} Escalated
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  {allTickets.filter((t) => t.status === "ai_handling").length} AI Handling
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" />
                  {allTickets.length} Total
                </span>
              </div>

              {/* Mobile: Card list */}
              <div className="sm:hidden space-y-3">
                {allTickets.map((ticket) => (
                  <div key={ticket._id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm leading-snug">{ticket.subject}</div>
                        <div className="text-white/40 text-xs mt-0.5">{ticket.school?.name || "Unknown"}</div>
                      </div>
                      {ticketStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/30">
                      <span className="font-mono">{ticket.ticketNumber}</span>
                      <span>{new Date(ticket.lastActivityAt).toLocaleDateString()}</span>
                    </div>
                    <Link
                      href={`/saas-admin/tickets/${ticket._id}`}
                      className="flex items-center justify-center gap-1 w-full text-xs text-violet-400 border border-violet-500/20 rounded-lg py-2 hover:bg-violet-500/5 transition-all"
                    >
                      View Thread <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
                {allTickets.length === 0 && (
                  <div className="text-center py-12 text-white/30 text-sm">No tickets found.</div>
                )}
              </div>

              {/* Desktop: Table */}
              <div className="hidden sm:block rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left">
                        {["Ticket", "School", "Subject", "Status", "Last Activity", "Action"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {allTickets.map((ticket) => (
                        <tr key={ticket._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 font-mono text-xs text-white/60 whitespace-nowrap">
                            {ticket.ticketNumber}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold">
                            {ticket.school?.name || "Unknown"}
                            <div className="text-white/30 text-xs mt-0.5 font-normal">
                              /{ticket.school?.slug || "?"}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm max-w-[200px]">
                            <div className="truncate">{ticket.subject}</div>
                            <div className="text-white/40 text-xs mt-0.5">{ticket.category}</div>
                          </td>
                          <td className="px-5 py-4">{ticketStatusBadge(ticket.status)}</td>
                          <td className="px-5 py-4 text-xs text-white/40 whitespace-nowrap">
                            {new Date(ticket.lastActivityAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/saas-admin/tickets/${ticket._id}`}
                              className="text-xs text-violet-400 hover:underline whitespace-nowrap"
                            >
                              View Thread →
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {allTickets.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-10 text-white/30">
                            No tickets found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* === MOBILE BOTTOM NAV === */}
        <nav className="lg:hidden sticky bottom-0 z-30 border-t border-white/5 bg-[#060610]/95 backdrop-blur-xl flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors relative ${
                activeTab === item.id ? "text-violet-400" : "text-white/30"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.id === "support" && allTickets.filter((t) => t.status === "escalated").length > 0 && (
                <span className="absolute top-2 right-1/4 translate-x-1/2 text-[9px] bg-amber-500 text-black font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {allTickets.filter((t) => t.status === "escalated").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
