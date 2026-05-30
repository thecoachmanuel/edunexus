"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Download, ArrowRight, Loader2, Building2 } from "lucide-react";

interface BillingInfo {
  school: {
    name: string;
    slug: string;
    isTrialActive: boolean;
    trialEndsAt?: string;
  };
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
    plan?: { name: string };
  };
  invoices: any[];
}

export default function BillingPage() {
  const [data, setData] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    axios.get("/api/billing/status")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setPayLoading(true);
    try {
      // For now, assume Growth plan as default, in reality we'd have a plan selector
      // or fetch the chosen plan from the DB.
      const res = await axios.post("/api/billing/initialize", { planSlug: "growth" });
      window.location.href = res.data.authorizationUrl;
    } catch (error) {
      console.error(error);
      alert("Failed to initialize payment");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  if (!data) return <div className="p-8">Failed to load billing information.</div>;

  const { school, subscription, invoices } = data;

  const getStatusBadge = (status?: string) => {
    if (school.isTrialActive) return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold border border-blue-500/20 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Trial Active</span>;
    if (status === "active") return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
    if (status === "past_due") return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Past Due</span>;
    return <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/20">Inactive</span>;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-violet-600" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-1">Manage your plan and billing history for {school.name}.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</h2>
              {getStatusBadge(subscription?.status)}
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-black mb-1">
                {subscription?.plan?.name || (school.isTrialActive ? "Free Trial" : "No Active Plan")}
              </div>
              {school.isTrialActive && school.trialEndsAt && (
                <div className="text-sm text-blue-600 flex items-center gap-1.5 mt-2">
                  <Clock className="w-4 h-4" />
                  Trial ends {new Date(school.trialEndsAt).toLocaleDateString()}
                </div>
              )}
              {subscription?.currentPeriodEnd && (
                <div className="text-sm text-muted-foreground mt-2">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t">
            {(!subscription || subscription.status !== "active") && (
              <button
                onClick={handleSubscribe}
                disabled={payLoading}
                className="w-full py-2.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
              >
                {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Subscribe Now</>}
              </button>
            )}
            <button className="w-full py-2.5 rounded-lg border hover:bg-accent transition-colors font-medium">
              View All Plans
            </button>
          </div>
        </div>

        {/* Payment Method Placeholder */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Payment Method</h2>
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
            <div className="w-12 h-8 rounded bg-white border shadow-sm flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <div className="font-medium">Paystack</div>
              <div className="text-sm text-muted-foreground">Managed securely via Paystack</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Your payment methods are securely stored with Paystack. EduNexus does not store your credit card information.
          </p>
        </div>
      </div>

      {/* Invoice History */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Billing History</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">₦{(inv.amount / 100).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-violet-600 hover:text-violet-800 transition-colors inline-flex items-center gap-1 text-sm font-medium">
                        <Download className="w-4 h-4" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
