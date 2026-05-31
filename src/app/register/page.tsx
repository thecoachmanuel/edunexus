"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  GraduationCap, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2,
  Building2, Mail, User, KeyRound, Globe, Sparkles
} from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  slug: string;
  monthlyPriceKobo: number;
  isHighlighted: boolean;
  trialAllowed: boolean;
  trialDays: number;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planFromUrl = searchParams.get("plan") || "starter";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    schoolName: "",
    slug: "",
    email: "",
    adminName: "",
    adminPassword: "",
  });

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    axios.get("/api/plans").then(res => setPlans(res.data.plans)).catch(() => {});
  }, []);

  // Auto-generate slug from school name
  useEffect(() => {
    if (!slugEdited && form.schoolName) {
      const auto = form.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setForm(f => ({ ...f, slug: auto }));
    }
  }, [form.schoolName, slugEdited]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "slug") setSlugEdited(true);
    setForm(f => ({ ...f, [name]: name === "slug" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post("/api/schools/register", { ...form, planSlug: selectedPlan });
      setSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (kobo: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

  const chosenPlan = plans.find(p => p.slug === selectedPlan);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-3">Check Your Email!</h2>
          <p className="text-foreground/50 mb-4">{success}</p>
          
            Please check your <strong>inbox</strong> or <strong>spam folder</strong> for the verification link to activate your account.
          </div>
          <p className="text-sm text-foreground/30">
            Your school portal will be at: <span className="text-violet-400 font-mono">/{form.slug}</span>
          </p>
          <Link href="/" className="inline-block mt-8 text-sm text-foreground/40 hover:text-foreground transition-colors">
          
            Please check your <strong>inbox</strong> or <strong>spam folder</strong> for the verification link to activate your account.
          </div>
          <p className="text-sm text-white/30">
            Your school portal will be at:{" "}
            <span className="text-violet-400 font-mono">/{form.slug}/login</span>
          </p>
          <Link href="/" className="inline-block mt-8 text-sm text-white/40 hover:text-white transition-colors">
            ← Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
        <div className="min-h-screen bg-background text-foreground flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 border-r border-white/5 bg-gradient-to-b from-violet-900/20 to-transparent">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          EduNexus
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" /> Built for Nigerian schools
          </div>
          <h2 className="text-4xl font-black leading-tight mb-6">
            Start running your school smarter in{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">2 minutes.</span>
          </h2>

          <ul className="space-y-4">
            {[
              "14-day free trial — no credit card required",
              "Get your own school URL instantly",
              "Import existing student data",
              "Dedicated onboarding support",
              "Pay in Naira (₦) monthly",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white/60 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-white/20 text-xs">
          <span>© {new Date().getFullYear()} EduNexus</span>
          <span>·</span>
          <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 font-bold text-lg mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            EduNexus
          </Link>

          <h1 className="text-2xl font-black mb-1">Create your school account</h1>
          <p className="text-white/40 text-sm mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 text-sm hover:underline font-medium">Find your school to log in</Link>
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Plan Selector */}
            {plans.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Select Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map(plan => (
                    <button
                      key={plan.slug}
                      type="button"
                      onClick={() => setSelectedPlan(plan.slug)}
                      className={`p-3 rounded-xl border text-left transition-all ${selectedPlan === plan.slug
                          ? "border-violet-500/50 bg-violet-500/10 text-white"
                          : "border-white/5 bg-white/[0.02] text-white/40 hover:border-white/10"
                        }`}
                    >
                      <div className="text-xs font-bold">{plan.name}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{formatPrice(plan.monthlyPriceKobo)}/mo</div>
                    </button>
                  ))}
                </div>
                {chosenPlan?.trialAllowed && (
                  <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {chosenPlan.trialDays}-day free trial included with this plan
                  </p>
                )}
              </div>
            )}

            {/* School Name */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">School Name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  name="schoolName"
                  value={form.schoolName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Greenfield Academy"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* School URL Slug */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Your School URL</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <div className="absolute left-10 top-1/2 -translate-y-1/2 text-white/20 text-sm pointer-events-none">edunexus.ng/</div>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="greenfield-academy"
                  className="w-full pl-[7.5rem] pr-4 py-3 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm font-mono focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
              {form.slug && (
                <p className="text-white/30 text-xs mt-1.5">
                  Your login page: <span className="text-violet-400 font-mono">/{form.slug}/login</span>
                </p>
              )}
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Your Name (Admin)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  name="adminName"
                  value={form.adminName}
                  onChange={handleChange}
                  required
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">School Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="admin@yourschool.edu.ng"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  name="adminPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.adminPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating your school...</>
              ) : (
                <>Create School Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-white/25 text-xs">
              By signing up, you agree to our{" "}
              <a href="#" className="text-white/40 hover:text-white underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-white/40 hover:text-white underline">Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
