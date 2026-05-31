"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, User, Clock, CheckCircle2, AlertTriangle, Shield, Settings,
  Activity, DollarSign, Calendar
} from "lucide-react";

export default function SchoolDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Available plans for changing plan
  const [plans, setPlans] = useState<any[]>([]);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState("");

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [schoolRes, plansRes] = await Promise.all([
        axios.get(`/api/superadmin/schools/${params.id}`),
        axios.get("/api/superadmin/plans")
      ]);
      setSchool(schoolRes.data.school);
      setPlans(plansRes.data.plans);
    } catch (err: any) {
      if (err.response?.status === 401) router.push("/saas-admin/login");
      if (err.response?.status === 404) router.push("/saas-admin/schools");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`/api/superadmin/schools/${params.id}`, { action: "toggle_active" });
      setSchool((prev: any) => ({ ...prev, isActive: res.data.school.isActive }));
    } catch (err) {
      alert("Failed to toggle status");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanSlug) return;
    setSaving(true);
    try {
      await axios.patch(`/api/superadmin/schools/${params.id}`, { 
        action: "change_plan", 
        planSlug: selectedPlanSlug 
      });
      await fetchData(); // Reload to get populated plan details
      setIsChangingPlan(false);
    } catch (err) {
      alert("Failed to change plan");
    } finally {
      setSaving(false);
    }
  };

  const handleExtendTrial = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/superadmin/schools/${params.id}`, { 
        action: "extend_trial", 
        trialDays: 14 
      });
      await fetchData();
    } catch (err) {
      alert("Failed to extend trial");
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

  if (!school) return null;

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
              <div className="text-white/40 text-sm font-mono mt-0.5">edunexus.io/{school.slug}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => window.open(`/${school.slug}/login`, '_blank')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            Visit Portal
          </button>
          <button 
            onClick={handleToggleActive}
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Building2 className="w-5 h-5 text-violet-400" /> School Profile</h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Email Address</label>
                <div className="text-sm mt-1">{school.email}</div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Onboarded At</label>
                <div className="text-sm mt-1">{new Date(school.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Status</label>
                <div className="mt-1 flex items-center gap-2">
                  {school.isActive ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Suspended</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Verification</label>
                <div className="mt-1 text-sm">{school.isVerified ? "Email Verified" : "Unverified"}</div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" /> Subscription & Billing</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
               <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Current Plan</label>
                <div className="text-lg font-bold mt-1 text-violet-400">
                  {school.subscription?.plan?.name || "No Plan"}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Billing Status</label>
                <div className="text-sm mt-1 capitalize font-medium">{school.subscription?.status || "Unknown"}</div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Free Trial</label>
                <div className="text-sm mt-1">
                  {school.isTrialActive ? (
                     <span className="text-blue-400 font-medium">Active until {new Date(school.trialEndsAt).toLocaleDateString()}</span>
                  ) : "Inactive"}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Current Period End</label>
                <div className="text-sm mt-1">
                  {school.subscription?.currentPeriodEnd ? new Date(school.subscription.currentPeriodEnd).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
              {isChangingPlan ? (
                <div className="flex-1 flex gap-2">
                  <select 
                    value={selectedPlanSlug} 
                    onChange={e => setSelectedPlanSlug(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Plan...</option>
                    {plans.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name} - ₦{p.monthlyPriceKobo / 100}/mo</option>
                    ))}
                  </select>
                  <button onClick={handleChangePlan} disabled={saving || !selectedPlanSlug} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Save</button>
                  <button onClick={() => setIsChangingPlan(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setIsChangingPlan(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                  Force Change Plan
                </button>
              )}
              
              {!isChangingPlan && (
                <button onClick={handleExtendTrial} disabled={saving} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors">
                  Add 14 Days Trial
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Stats */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Usage Limits</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Students</span>
                  <span className="font-medium">254 / {school.subscription?.plan?.features?.maxStudents === -1 ? "Unlimited" : school.subscription?.plan?.features?.maxStudents || 300}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/5 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">LMS Module</span>
                  {school.subscription?.plan?.features?.lmsEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-white/30 text-xs font-medium bg-white/5 px-2 py-0.5 rounded">Locked</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Finance Module</span>
                  {school.subscription?.plan?.features?.financeEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-white/30 text-xs font-medium bg-white/5 px-2 py-0.5 rounded">Locked</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
