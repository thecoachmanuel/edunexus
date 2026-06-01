"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  CreditCard, CheckCircle2, AlertTriangle, Clock, Download, Loader2, Building2,
  Calendar, ToggleLeft, ToggleRight, Plus, Minus
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const reference = searchParams?.get("reference") || searchParams?.get("trxref");

  const [data, setData] = useState<BillingInfo | null>(null);
  const [verifying, setVerifying] = useState(!!reference);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [quantity, setQuantity] = useState(1);
  const [planSlug, setPlanSlug] = useState("growth");
  const [plans, setPlans] = useState<any[]>([]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewDays, setPreviewDays] = useState<number | null>(null);

  useEffect(() => {
    const loadData = () => {
      axios.get("/api/billing/status")
        .then(res => setData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));

      axios.get("/api/plans")
        .then(res => setPlans(res.data?.plans || []))
        .catch(() => {});
    };

    if (reference) {
      // Proactively verify transaction to ensure instant dashboard updates
      axios.get(`/api/billing/verify?reference=${reference}`)
        .then(() => {
          toast.success("Payment verified successfully!");
          // Remove reference from URL to prevent infinite verification loops
          window.history.replaceState(null, "", `/${slug}/billing`);
        })
        .catch(err => {
          console.error("Verification failed", err);
          toast.error("Verification pending. If payment was successful, it will reflect shortly.");
        })
        .finally(() => {
          setVerifying(false);
          loadData();
        });
    } else {
      loadData();
    }
  }, [reference, slug]);

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

  // Calculate preview price whenever cycle / quantity / planSlug changes
  useEffect(() => {
    const selectedPlan = plans.find((p: any) => p.slug === planSlug);
    if (!selectedPlan) return;

    let unitKobo: number;
    if (cycle === "annual") {
      unitKobo = selectedPlan.annualPriceKobo ?? Math.round(selectedPlan.monthlyPriceKobo * 12 * 0.85);
    } else {
      unitKobo = selectedPlan.monthlyPriceKobo;
    }

    setPreviewTotal(unitKobo * quantity);
    setPreviewDays(cycle === "annual" ? quantity * 365 : quantity * 30);
  }, [cycle, quantity, planSlug, plans]);

  const handleSubscribe = async () => {
    setPayLoading(true);
    try {
      const res = await axios.post("/api/billing/initialize", { planSlug, cycle, quantity });
      window.location.href = res.data.authorizationUrl;
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to initialize payment");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        {verifying && <p className="text-muted-foreground font-medium animate-pulse">Verifying your payment securely...</p>}
      </div>
    );
  }

  if (!data) return <div className="p-8">Failed to load billing information.</div>;

  const { school, subscription, invoices } = data;

  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const getStatusBadge = (status?: string) => {
    if (school.isTrialActive) return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold border border-blue-500/20 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Trial Active</span>;
    if (status === "active") return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
    if (status === "past_due") return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Past Due</span>;
    return <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/20">Inactive</span>;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-violet-600" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing history for {school.name}.</p>
      </div>

      {/* Expiry alert banner */}
      {subscription?.status === "past_due" && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-500 font-medium">Your subscription has expired. Please renew to restore access.</p>
        </div>
      )}
      {subscription?.status === "active" && daysRemaining <= 7 && daysRemaining > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 font-medium">Your subscription expires in <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong>. Top up now to avoid interruption.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</h2>
              {getStatusBadge(subscription?.status)}
            </div>
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
              <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Expires {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                {subscription.status === "active" && daysRemaining > 0 && (
                  <span className="text-xs font-medium text-emerald-600 ml-1">({daysRemaining} days left)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment / Top Up Card */}
        <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Up / Subscribe</h2>

          {/* Plan Selector */}
          {plans.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
              <select
                value={planSlug}
                onChange={e => setPlanSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {plans.map((p: any) => (
                  <option key={p._id} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Billing Cycle</label>
            <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
              <button
                onClick={() => setCycle("monthly")}
                className={`flex-1 py-2 transition-colors ${cycle === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("annual")}
                className={`flex-1 py-2 transition-colors ${cycle === "annual" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60"}`}
              >
                Annual <span className="text-xs opacity-75">(Save 15%)</span>
              </button>
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Duration ({cycle === "annual" ? "years" : "months"})
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-muted/60 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(36, q + 1))}
                className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-muted/60 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                = {previewDays} days added
              </span>
            </div>
          </div>

          {/* Price Preview */}
          {previewTotal !== null && (
            <div className="p-3 rounded-lg bg-muted/30 border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-black">{formatNGN(previewTotal)}</span>
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={payLoading}
            className="w-full py-3 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
          >
            {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {subscription?.status === "active" ? "Add More Time" : "Subscribe Now"}
          </button>
          <p className="text-xs text-center text-muted-foreground">Secured by Paystack. We never store card details.</p>
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
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">{inv.description || "Subscription Payment"}</td>
                    <td className="px-6 py-4 font-bold">₦{(inv.amountKobo / 100).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        {inv.status}
                      </span>
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
