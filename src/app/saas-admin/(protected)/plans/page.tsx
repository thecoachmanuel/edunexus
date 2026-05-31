"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CreditCard, Edit2, Plus, Star, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  monthlyPriceKobo: number;
  paystackPlanCode?: string;
  features: {
    maxStudents: number;
    lmsEnabled: boolean;
    financeEnabled: boolean;
    aiTimetableEnabled: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
  };
  isActive: boolean;
  isHighlighted: boolean;
  trialAllowed: boolean;
  trialDays: number;
}

export default function PlansManagement() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [router]);

  const fetchPlans = async () => {
    try {
      const res = await axios.get("/api/superadmin/plans");
      setPlans(res.data.plans);
    } catch (err: any) {
      if (err.response?.status === 401) router.push("/saas-admin/login");
    } finally {
      setLoading(false);
    }
  };

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(kobo / 100);

  const handleEdit = (plan: Plan) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan))); // Deep copy
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    try {
      if (editingPlan._id) {
        await axios.put(`/api/superadmin/plans/${editingPlan._id}`, editingPlan);
      } else {
        await axios.post("/api/superadmin/plans", editingPlan);
      }
      setIsModalOpen(false);
      setEditingPlan(null);
      await fetchPlans();
    } catch (err) {
      alert("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading Plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Subscription Plans</h2>
        <button
          onClick={() => {
            setEditingPlan({
              _id: "", name: "", slug: "", monthlyPriceKobo: 0,
              features: {
                maxStudents: 300, lmsEnabled: false, financeEnabled: false,
                aiTimetableEnabled: true, advancedAnalytics: false,
                prioritySupport: false, dedicatedSupport: false
              },
              isActive: true, isHighlighted: false, trialAllowed: true, trialDays: 14
            } as any);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan._id} className={`p-6 rounded-2xl border flex flex-col relative ${
            plan.isHighlighted 
              ? "border-violet-500/50 bg-gradient-to-b from-violet-500/10 to-indigo-500/5" 
              : "border-white/5 bg-white/[0.02]"
          }`}>
            {!plan.isActive && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10 rounded-2xl flex flex-col items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                <span className="font-bold text-white">Deactivated</span>
                <button onClick={() => handleEdit(plan)} className="mt-4 px-4 py-1.5 bg-white/10 rounded-lg text-sm hover:bg-white/20">Edit to reactivate</button>
              </div>
            )}
            
            <div className="flex items-start justify-between mb-4">
              <div>
                {plan.isHighlighted && <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2"><Star className="w-3 h-3 fill-violet-400" /> Most Popular</span>}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="text-white/40 text-xs font-mono mt-1">slug: {plan.slug}</div>
              </div>
              <button 
                onClick={() => handleEdit(plan)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black">{formatNGN(plan.monthlyPriceKobo)}</span>
              <span className="text-white/40 text-sm">/month</span>
            </div>

            {plan.trialAllowed && (
              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Includes {plan.trialDays}-day free trial
              </div>
            )}

            <div className="space-y-3 mb-6 flex-1 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Max Students</span>
                <span className="font-semibold text-white">{plan.features.maxStudents === -1 ? "Unlimited" : plan.features.maxStudents}</span>
              </div>
              {[
                { key: "aiTimetableEnabled", label: "AI Timetable" },
                { key: "lmsEnabled", label: "LMS Module" },
                { key: "financeEnabled", label: "Finance Module" },
                { key: "advancedAnalytics", label: "Advanced Analytics" },
                { key: "prioritySupport", label: "Priority Support" },
                { key: "dedicatedSupport", label: "Dedicated Agent" },
              ].map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${(plan.features as any)[f.key] ? "text-emerald-400" : "text-white/20"}`} />
                  <span className={(plan.features as any)[f.key] ? "text-white" : "text-white/40 line-through"}>{f.label}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 text-xs text-white/40 font-mono">
              Paystack Code: {plan.paystackPlanCode || "None"}
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0a0a18] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0a0a18]/90 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-center z-10">
              <h3 className="text-xl font-bold">{editingPlan._id ? "Edit Plan" : "Create Plan"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Plan Name</label>
                  <input required value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Slug</label>
                  <input required value={editingPlan.slug} disabled={!!editingPlan._id} onChange={e => setEditingPlan({...editingPlan, slug: e.target.value.toLowerCase()})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Monthly Price (Kobo) <span className="text-white/30 ml-1">e.g. 1500000 = ₦15,000</span></label>
                  <input required type="number" value={editingPlan.monthlyPriceKobo} onChange={e => setEditingPlan({...editingPlan, monthlyPriceKobo: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Paystack Plan Code (Optional)</label>
                  <input value={editingPlan.paystackPlanCode || ""} onChange={e => setEditingPlan({...editingPlan, paystackPlanCode: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="font-semibold mb-4 text-sm">Free Trial Setting</h4>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editingPlan.trialAllowed} onChange={e => setEditingPlan({...editingPlan, trialAllowed: e.target.checked})} className="rounded bg-white/10 border-white/20 text-violet-500" />
                    Allow Free Trial
                  </label>
                  {editingPlan.trialAllowed && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50">Days:</span>
                      <input type="number" value={editingPlan.trialDays} onChange={e => setEditingPlan({...editingPlan, trialDays: parseInt(e.target.value)})} className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="font-semibold mb-4 text-sm">Plan Features</h4>
                
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-white/50 mb-1">Max Students (-1 for unlimited)</label>
                  <input type="number" value={editingPlan.features.maxStudents} onChange={e => setEditingPlan({...editingPlan, features: {...editingPlan.features, maxStudents: parseInt(e.target.value)}})} className="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: "lmsEnabled", label: "LMS Enabled" },
                    { key: "financeEnabled", label: "Finance Enabled" },
                    { key: "aiTimetableEnabled", label: "AI Timetable" },
                    { key: "advancedAnalytics", label: "Advanced Analytics" },
                    { key: "prioritySupport", label: "Priority Support" },
                    { key: "dedicatedSupport", label: "Dedicated Support" },
                  ].map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm p-3 rounded-lg border border-white/5 bg-white/5">
                      <input type="checkbox" checked={(editingPlan.features as any)[f.key]} onChange={e => setEditingPlan({...editingPlan, features: {...editingPlan.features, [f.key]: e.target.checked}})} className="rounded bg-white/10 border-white/20 text-violet-500" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-4">
                 <label className="flex items-center gap-2 text-sm p-3 rounded-lg border border-white/5 bg-white/5">
                    <input type="checkbox" checked={editingPlan.isHighlighted} onChange={e => setEditingPlan({...editingPlan, isHighlighted: e.target.checked})} className="rounded bg-white/10 border-white/20 text-violet-500" />
                    Highlight as "Most Popular"
                  </label>
                  <label className="flex items-center gap-2 text-sm p-3 rounded-lg border border-white/5 bg-white/5">
                    <input type="checkbox" checked={editingPlan.isActive} onChange={e => setEditingPlan({...editingPlan, isActive: e.target.checked})} className="rounded bg-white/10 border-white/20 text-violet-500" />
                    Plan is Active
                  </label>
              </div>

              <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-[#0a0a18] p-4 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-medium hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
