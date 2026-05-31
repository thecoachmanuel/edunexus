"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, ToggleLeft, ToggleRight, ExternalLink
} from "lucide-react";

interface School {
  _id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  isTrialActive: boolean;
  subscription?: {
    status: string;
    plan?: { name: string };
  };
}

export default function SchoolsManagement() {
  const router = useRouter();
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schools = await axios.get("/api/superadmin/schools");
        setAllSchools(schools.data.schools);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading Schools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
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

      <div className="sm:hidden space-y-3">
        {filteredSchools.map((school) => (
          <div key={school._id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
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
  );
}
