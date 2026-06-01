"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, CheckCircle2, AlertTriangle, Activity,
  DollarSign, Users, BookOpen, School, BarChart3, CreditCard,
  TrendingUp, XCircle, Clock,
} from "lucide-react";
import { use } from "react";

function formatNGN(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    trialing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    past_due: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    expired: "bg-red-500/15 text-red-400 border-red-500/20",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    failed: "bg-red-500/15 text-red-400 border-red-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };
  return map[status] || "bg-white/10 text-white/50 border-white/10";
}

function UsageBar({ label, used, max, color = "violet" }: { label: string; used: number; max: number | "unlimited"; color?: string }) {
  const isUnlimited = max === "unlimited" || max === -1;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / (max as number)) * 100));
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : `bg-${color}-500`;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white">
          {used} / {isUnlimited ? <span className="text-emerald-400 text-xs">Unlimited</span> : max}
        </span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2">
        {!isUnlimited && (
          <div
            className={`${barColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && (
          <div className="bg-emerald-500/30 h-2 rounded-full w-full" />
        )}
      </div>
      {!isUnlimited && pct >= 90 && (
        <p className="text-red-400 text-xs mt-1">⚠ Near limit</p>
      )}
    </div>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-white/60 text-sm">{label}</span>
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <span className="text-white/25 text-xs font-medium bg-white/5 px-2 py-0.5 rounded">Locked</span>
      )}
    </div>
  );
}

export default function SchoolDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", slug: "" });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [schoolRes, plansRes] = await Promise.all([
        axios.get(`/api/superadmin/schools/${id}`),
        axios.get("/api/superadmin/plans"),
      ]);
      setData(schoolRes.data);
      setEditForm({
        name: schoolRes.data.school.name,
        email: schoolRes.data.school.email,
        slug: schoolRes.data.school.slug,
      });
      setPlans(plansRes.data.plans || []);
    } catch (err: any) {
      if (err.response?.status === 401) router.push("/saas-admin/login");
      if (err.response?.status === 404) router.push("/saas-admin/schools");
    } finally {
      setLoading(false);
    }
  };

  const patch = async (body: any) => {
    setSaving(true);
    try {
      await axios.patch(`/api/superadmin/schools/${id}`, body);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Are you sure you want to reset the admin password for this school?")) return;
    setSaving(true);
    try {
      const res = await axios.patch(`/api/superadmin/schools/${id}`, { action: "reset_admin_password" });
      alert(`Password reset!\nNew Password: ${res.data.newPassword}\nAdmin Email: ${res.data.adminEmail}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const { school, studentCount, teacherCount, adminCount, classCount, totalRevenueKobo, recentTransactions } = data;
  const plan = school.subscription?.plan;
  const maxStudents = plan?.features?.maxStudents ?? 300;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <Link href="/saas-admin/schools" className="text-white/40 hover:text-white flex items-center gap-2 text-sm mb-2 w-max">
            <ArrowLeft className="w-4 h-4" /> Back to Schools
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-xl">
              {school.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{school.name}</h2>
              <div className="text-white/40 text-sm font-mono mt-0.5">/{school.slug}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.open(`/${school.slug}/login`, "_blank")}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
          >
            Visit Portal
          </button>
          <button
            onClick={() => patch({ action: "toggle_active" })}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 ${
              school.isActive
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
            }`}
          >
            {school.isActive ? "Suspend School" : "Reactivate School"}
          </button>
        </div>
      </div>

      {/* Revenue stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatNGN(totalRevenueKobo), icon: DollarSign, color: "emerald" },
          { label: "Students", value: studentCount, icon: Users, color: "indigo" },
          { label: "Teachers", value: teacherCount, icon: School, color: "violet" },
          { label: "Classes", value: classCount, icon: BookOpen, color: "blue" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
            <s.icon className={`w-4 h-4 mb-2 text-${s.color}-400`} />
            <div className="text-xl font-black">{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* LEFT: School Profile + Subscription */}
        <div className="md:col-span-2 space-y-6">
          {/* School Profile */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-violet-400" /> School Profile</h3>
              <div className="flex gap-2">
                <button onClick={handleResetPassword} disabled={saving} className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors">
                  Reset Password
                </button>
                {isEditing ? (
                  <button onClick={() => patch({ action: "update_details", ...editForm }).then(() => setIsEditing(false))} disabled={saving} className="text-xs px-3 py-1.5 bg-violet-500 text-white rounded-lg">
                    Save
                  </button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="text-xs px-3 py-1.5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-lg">
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { label: "School Name", field: "name", value: school.name },
                { label: "Email Address", field: "email", value: school.email, type: "email" },
                { label: "School Slug (URL)", field: "slug", value: school.slug, mono: true },
                { label: "Onboarded At", value: new Date(school.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" }), readonly: true },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs text-white/40 uppercase tracking-wider">{f.label}</label>
                  {isEditing && !f.readonly && f.field ? (
                    <input
                      type={f.type || "text"}
                      value={(editForm as any)[f.field]}
                      onChange={(e) => setEditForm({ ...editForm, [f.field!]: e.target.value })}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                    />
                  ) : (
                    <div className={`text-sm mt-1 ${f.mono ? "font-mono" : ""}`}>{f.value}</div>
                  )}
                </div>
              ))}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Status</label>
                <div className="mt-1">
                  {school.isActive
                    ? <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Active</span>
                    : <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Suspended</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Email Verification</label>
                <div className="text-sm mt-1">{school.isVerified ? "✓ Verified" : "Unverified"}</div>
              </div>
            </div>
          </div>

          {/* Subscription & Billing */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-6"><DollarSign className="w-5 h-5 text-emerald-400" /> Subscription & Billing</h3>
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Current Plan</label>
                <div className="text-xl font-bold mt-1 text-violet-400">{plan?.name || "No Plan"}</div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Billing Status</label>
                <div className="mt-1">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusBadge(school.subscription?.status || "unknown")}`}>
                    {school.subscription?.status || "Unknown"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Free Trial</label>
                <div className="text-sm mt-1">
                  {school.isTrialActive
                    ? <span className="text-blue-400 font-medium">Active until {new Date(school.trialEndsAt).toLocaleDateString()}</span>
                    : "Inactive"}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Subscription Ends</label>
                <div className="text-sm mt-1">
                  {school.subscription?.currentPeriodEnd
                    ? new Date(school.subscription.currentPeriodEnd).toLocaleDateString("en-NG", { dateStyle: "medium" })
                    : "—"}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
              {isChangingPlan ? (
                <div className="flex-1 flex gap-2">
                  <select
                    value={selectedPlanSlug}
                    onChange={(e) => setSelectedPlanSlug(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select plan...</option>
                    {plans.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name} — ₦{(p.monthlyPriceKobo / 100).toLocaleString()}/mo</option>
                    ))}
                  </select>
                  <button onClick={() => patch({ action: "change_plan", planSlug: selectedPlanSlug }).then(() => setIsChangingPlan(false))} disabled={saving || !selectedPlanSlug} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
                  <button onClick={() => setIsChangingPlan(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setIsChangingPlan(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                  Force Change Plan
                </button>
              )}
              {!isChangingPlan && (
                <button onClick={() => patch({ action: "extend_trial", trialDays: 14 })} disabled={saving} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors">
                  + 14 Days Trial
                </button>
              )}
            </div>
          </div>

          {/* Transaction History for this school */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-400" /> Payment History</h3>
              <div className="text-right">
                <div className="text-xs text-white/40">Total Paid</div>
                <div className="text-lg font-bold text-emerald-400">{formatNGN(totalRevenueKobo)}</div>
              </div>
            </div>
            {recentTransactions?.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((tx: any) => (
                  <div key={tx._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <div className="text-sm font-medium">{tx.description || tx.type?.replace("_", " ")}</div>
                      <div className="text-xs text-white/40 mt-0.5 font-mono">{tx.reference} · {new Date(tx.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(tx.status)}`}>{tx.status}</span>
                      <span className="text-sm font-bold text-white">{formatNGN(tx.amountKobo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-white/30 text-sm py-8">No payment transactions recorded yet.</p>
            )}
          </div>
        </div>

        {/* RIGHT: Usage Limits + Plan Features */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Usage Limits</h3>
            <div className="space-y-5">
              <UsageBar label="Students" used={studentCount} max={maxStudents} color="indigo" />
              <UsageBar label="Teachers" used={teacherCount} max={50} color="violet" />
              <UsageBar label="Classes" used={classCount} max={30} color="blue" />
              <UsageBar label="Admins" used={adminCount} max={5} color="amber" />
            </div>

            <div className="mt-6 pt-5 border-t border-white/5">
              <h4 className="text-xs text-white/40 uppercase tracking-wider mb-3">Plan Features</h4>
              <div className="divide-y divide-white/5">
                <FeatureRow label="LMS (Quizzes & Materials)" enabled={plan?.features?.lmsEnabled ?? false} />
                <FeatureRow label="Finance Module" enabled={plan?.features?.financeEnabled ?? false} />
                <FeatureRow label="AI Timetable" enabled={plan?.features?.aiTimetableEnabled ?? true} />
                <FeatureRow label="Advanced Analytics" enabled={plan?.features?.advancedAnalytics ?? false} />
                <FeatureRow label="Priority Support" enabled={plan?.features?.prioritySupport ?? false} />
              </div>
            </div>
          </div>

          {/* Plan pricing card */}
          {plan && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-400" /> Plan Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Monthly</span>
                  <span className="font-bold">{formatNGN(plan.monthlyPriceKobo)}</span>
                </div>
                {plan.annualPriceKobo && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Annual</span>
                    <span className="font-bold">{formatNGN(plan.annualPriceKobo)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/50">Max Students</span>
                  <span className="font-bold">{plan.features?.maxStudents === -1 ? "Unlimited" : plan.features?.maxStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Trial Days</span>
                  <span className="font-bold">{plan.trialDays ?? 14} days</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
