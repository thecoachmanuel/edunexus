"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  GraduationCap, CheckCircle2, ArrowRight, Zap, Users, BarChart3,
  BookOpen, Clock, Shield, Star, ChevronDown, Menu, X, Building2,
  Sparkles, TrendingUp, Award
} from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Student Management", desc: "Complete student profiles, enrollment tracking, and parent portals all in one place." },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Real-time dashboards and AI-powered insights to make data-driven decisions." },
  { icon: Clock, title: "AI Timetable Generator", desc: "Generate conflict-free timetables in seconds using our powerful AI engine." },
  { icon: BookOpen, title: "Learning Management (LMS)", desc: "Quizzes, study materials, assignments — a full LMS built into the platform." },
  { icon: Zap, title: "Finance & Fees", desc: "Automated fee management, invoicing, expenses, and salary tracking." },
  { icon: Shield, title: "Role-Based Access", desc: "Granular permissions for admins, teachers, students, and parents." },
];

const TESTIMONIALS = [
  { name: "Mrs. Adaeze Okonkwo", role: "Principal, Greenfield Academy, Lagos", text: "EduNexus transformed how we manage our 800+ students. The AI timetable alone saves us 3 hours every term.", rating: 5 },
  { name: "Mr. Emeka Nwosu", role: "Admin, Sunrise International, Abuja", text: "The parent portal and fee tracking are incredible. Our parents love the transparency it brings.", rating: 5 },
  { name: "Dr. Funmi Adeyemi", role: "Director, Covenant Schools, Ibadan", text: "We tried 3 platforms before EduNexus. This is the only one built for Nigerian schools.", rating: 5 },
];

interface Plan {
  _id: string;
  name: string;
  slug: string;
  monthlyPriceKobo: number;
  features: {
    maxStudents: number;
    lmsEnabled: boolean;
    financeEnabled: boolean;
    aiTimetableEnabled: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
  };
  isHighlighted: boolean;
  trialAllowed: boolean;
  trialDays: number;
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/plans").then(res => setPlans(res.data.plans)).catch(() => {});
  }, []);

  const formatPrice = (kobo: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* === NAVBAR === */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">EduNexus</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/register"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
            >
              Start Free Trial
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white/70">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white/70">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white/70">Pricing</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white/70">Testimonials</a>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-center font-semibold text-sm">Start Free Trial</Link>
          </div>
        )}
      </header>

      {/* === HERO === */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-indigo-600/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Built for Nigerian schools — Powered by AI
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Run Your School{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Smarter.
            </span>
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one school management platform with AI-powered tools for academics, finance, attendance, and more. Join hundreds of Nigerian schools already on EduNexus.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base hover:opacity-90 transition-all shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5"
            >
              Start 14-Day Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white/70 font-semibold text-base hover:border-white/20 hover:text-white transition-all"
            >
              Explore Features
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-white/40">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Set up in 2 minutes</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> NGN pricing</span>
          </div>
        </div>
      </section>

      {/* === STATS === */}
      <section className="py-16 px-4 sm:px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "Schools Onboarded" },
            { value: "120K+", label: "Students Managed" },
            { value: "99.9%", label: "Uptime SLA" },
            { value: "4.9★", label: "Average Rating" },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === FEATURES === */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-4">
              <Zap className="w-3 h-3" /> Everything You Need
            </div>
            <h2 className="text-4xl font-black mb-4">All-in-one platform</h2>
            <p className="text-white/40 max-w-xl mx-auto">Every tool your school needs, deeply integrated and beautifully designed.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <f.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium mb-4">
              <Award className="w-3 h-3" /> Trusted by Schools
            </div>
            <h2 className="text-4xl font-black mb-4">School leaders love EduNexus</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PRICING === */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium mb-4">
              <TrendingUp className="w-3 h-3" /> Simple Pricing
            </div>
            <h2 className="text-4xl font-black mb-4">Pay in Naira, no surprises</h2>
            <p className="text-white/40">All plans include a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan._id} className={`relative p-7 rounded-2xl border flex flex-col ${plan.isHighlighted
                  ? "border-violet-500/50 bg-gradient-to-b from-violet-500/10 to-indigo-500/5 shadow-xl shadow-violet-500/10"
                  : "border-white/5 bg-white/[0.02]"
                }`}>
                {plan.isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-bold">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black">{formatPrice(plan.monthlyPriceKobo)}</span>
                    <span className="text-white/40 text-sm">/month</span>
                  </div>
                  {plan.trialAllowed && (
                    <p className="text-emerald-400 text-xs font-medium mb-5">✅ {plan.trialDays}-day free trial included</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    { label: `Up to ${plan.features.maxStudents === -1 ? "Unlimited" : plan.features.maxStudents} students`, enabled: true },
                    { label: "AI Timetable Generator", enabled: plan.features.aiTimetableEnabled },
                    { label: "Finance & Fee Management", enabled: plan.features.financeEnabled },
                    { label: "Learning Management (LMS)", enabled: plan.features.lmsEnabled },
                    { label: "Advanced Analytics", enabled: plan.features.advancedAnalytics },
                    { label: "Priority Support", enabled: plan.features.prioritySupport },
                    { label: "Dedicated Account Manager", enabled: plan.features.dedicatedSupport },
                  ].map((item, i) => (
                    <li key={i} className={`flex items-center gap-2.5 text-sm ${item.enabled ? "text-white/80" : "text-white/20 line-through"}`}>
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.enabled ? "text-emerald-400" : "text-white/20"}`} />
                      {item.label}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${plan.slug}`}
                  className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.isHighlighted
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-violet-500/25"
                      : "border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                    }`}
                >
                  {plan.trialAllowed ? "Start Free Trial" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-transparent">
            <Building2 className="w-12 h-12 text-violet-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4">Ready to transform your school?</h2>
            <p className="text-white/50 mb-8">Join hundreds of Nigerian schools running smarter on EduNexus. Start your 14-day free trial today — no credit card needed.</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base hover:opacity-90 transition-all shadow-2xl shadow-violet-500/30"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-white/5 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} EduNexus. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
