"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, AlertTriangle, CheckCircle2,
  Clock, DollarSign, ArrowUpRight
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
  subscription?: {
    status: string;
    plan?: { name: string };
  };
}

export default function SuperAdminOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const overview = await axios.get("/api/superadmin/overview");
        setStats(overview.data.stats);
        setRecentSchools(overview.data.recentSchools);
      } catch (err: any) {
        if (err.response?.status === 401) router.push("/saas-admin/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(kobo / 100);

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading Overview...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
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

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base">Recently Onboarded</h2>
          <Link
            href="/saas-admin/schools"
            className="text-xs text-violet-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

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
  );
}
