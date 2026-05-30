"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, DollarSign, ArrowUpRight, Search, Shield, LogOut,
  MoreHorizontal, ToggleLeft, ToggleRight, ExternalLink, Ticket,
  Settings, ChevronDown, BarChart3, Bell, Bot
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

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [allTickets, setAllTickets] = useState<AdminTicket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "schools" | "support">("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overview, schools, ticketsRes] = await Promise.all([
          axios.get("/api/superadmin/overview"),
          axios.get("/api/superadmin/schools"),
          axios.get("/api/superadmin/tickets")
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
      const res = await axios.patch(`/api/superadmin/schools/${schoolId}`, { action: "toggle_active" });
      setAllSchools(s => s.map(sc => sc._id === schoolId ? { ...sc, isActive: !sc.isActive } : sc));
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleExtendTrial = async (schoolId: string, days: number) => {
    try {
      await axios.patch(`/api/superadmin/schools/${schoolId}`, { action: "extend_trial", trialDays: days });
      alert(`Trial extended by ${days} days`);
    } catch (err) {
      console.error("Extend trial failed:", err);
    }
  };

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

  const filteredSchools = allSchools.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.includes(search.toLowerCase()) || s.email.includes(search.toLowerCase())
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
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 border-r border-white/5 bg-[#0a0a18] flex flex-col z-40">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold">EduNexus</div>
              <div className="text-[10px] text-white/30">Admin Console</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "schools", label: "Schools", icon: Building2 },
            { id: "support", label: "Support Tickets", icon: Ticket },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={async () => {
              await axios.post("/api/superadmin/auth/logout").catch(() => {});
              router.push("/saas-admin/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#060610]/90 backdrop-blur-xl px-8 h-14 flex items-center justify-between">
          <h1 className="font-bold text-base capitalize">
            {activeTab === "overview" ? "Dashboard Overview" : activeTab === "schools" ? "School Management" : "Support Tickets"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* === OVERVIEW TAB === */}
          {activeTab === "overview" && stats && (
            <div>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {[
                  { label: "Total Schools", value: stats.totalSchools, icon: Building2, color: "violet" },
                  { label: "Active", value: stats.activeSchools, icon: CheckCircle2, color: "emerald" },
                  { label: "Trialing", value: stats.trialSchools, icon: Clock, color: "blue" },
                  { label: "Past Due", value: stats.pastDueSchools, icon: AlertTriangle, color: "amber" },
                  { label: "Total Users", value: stats.totalUsers, icon: Users, color: "indigo" },
                  { label: "Revenue", value: formatNGN(stats.totalRevenueKobo), icon: DollarSign, color: "emerald" },
                ].map((stat, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <stat.icon className={`w-5 h-5 mb-3 text-${stat.color}-400`} />
                    <div className="text-2xl font-black">{stat.value}</div>
                    <div className="text-xs text-white/40 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Schools */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="font-bold">Recently Onboarded Schools</h2>
                  <button onClick={() => setActiveTab("schools")} className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
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
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search schools..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
                <span className="text-white/40 text-sm">{filteredSchools.length} schools</span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left">
                        {["School", "Plan", "Status", "Trial", "Users", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {filteredSchools.map(school => (
                        <tr key={school._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-sm">{school.name}</div>
                            <div className="text-white/30 text-xs mt-0.5 font-mono">/{school.slug}</div>
                          </td>
                          <td className="px-5 py-4 text-sm text-white/60">
                            {school.subscription?.plan?.name || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge(school.subscription?.status || "unknown")}`}>
                              {school.subscription?.status || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-white/40">
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
                                : <ToggleLeft className="w-5 h-5" />
                              }
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
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                              >
                                +14d Trial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* === SUPPORT TAB === */}
          {activeTab === "support" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Support Queue</h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 
                    {allTickets.filter(t => t.status === "escalated").length} Escalated
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> 
                    {allTickets.filter(t => t.status === "ai_handling").length} AI Handling
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      {["Ticket", "School", "Subject", "Status", "Last Activity", "Action"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {allTickets.map(ticket => (
                      <tr key={ticket._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-white/60">
                          {ticket.ticketNumber}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold">
                          {ticket.school?.name || "Unknown"}
                          <div className="text-white/30 text-xs mt-0.5 font-normal">/{ticket.school?.slug || "?"}</div>
                        </td>
                        <td className="px-5 py-4 text-sm max-w-[200px] truncate">
                          {ticket.subject}
                          <div className="text-white/40 text-xs mt-0.5">{ticket.category}</div>
                        </td>
                        <td className="px-5 py-4">
                           {ticket.status === "escalated" && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Escalated</span>}
                           {ticket.status === "ai_handling" && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">AI Agent</span>}
                           {ticket.status === "open" && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 font-medium">Open</span>}
                           {(ticket.status === "resolved" || ticket.status === "closed") && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">{ticket.status}</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-white/40">
                          {new Date(ticket.lastActivityAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/saas-admin/tickets/${ticket._id}`} className="text-xs text-violet-400 hover:underline">
                            View Thread &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {allTickets.length === 0 && (
                      <tr><td colSpan={6} className="text-center p-8 text-white/40">No tickets found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
