"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { GraduationCap, ArrowRight, Loader2, School, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function SchoolLoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [schoolInfo, setSchoolInfo] = useState<{ name: string; logo?: string } | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifyError, setIsVerifyError] = useState(false);
  const [resending, setResending] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const pending = form.formState.isSubmitting;

  // Fetch school branding info
  useEffect(() => {
    if (!slug) return;
    axios.get(`/api/schools/${slug}`)
      .then((res) => setSchoolInfo(res.data.school))
      .catch(() => setSchoolInfo(null))
      .finally(() => setSchoolLoading(false));
  }, [slug]);

  // ─── TENANT-AWARE SESSION REDIRECT ────────────────────────────────────────
  // Only redirect if user is already authenticated AND belongs to THIS school
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const userSlug = (user as any)?.schoolContext?.slug as string | undefined;
    if (userSlug && userSlug === slug) {
      // Already logged into this school — go straight to dashboard
      router.replace(`/${slug}/dashboard`);
    }
    // If userSlug !== slug (different school session), stay on this login page
    // The user must authenticate for this specific school
  }, [user, authLoading, slug, router]);

  const onSubmit = async (data: LoginValues) => {
    setLoginError(null);
    setIsVerifyError(false);
    try {
      // If there's a stale session from another school, clear it first
      const userSlug = (user as any)?.schoolContext?.slug as string | undefined;
      if (userSlug && userSlug !== slug) {
        await axios.post("/api/users/logout").catch(() => {});
      }

      await axios.post("/api/users/login", {
        email: data.email,
        password: data.password,
        slug,
      });

      toast.success(`Welcome back! Redirecting to ${schoolInfo?.name || slug}...`);
      // Hard navigate to flush the auth context with the new session
      window.location.href = `/${slug}/dashboard`;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid email or password.";
      setLoginError(msg);
      if (msg.toLowerCase().includes("verified")) {
        setIsVerifyError(true);
      }
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await axios.post("/api/schools/resend-verification", { slug });
      toast.success("Verification email resent! Please check your inbox and spam folder.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Show full-screen loader while auth is initialising
  if (authLoading || schoolLoading) {
    return (
            <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
        <div className="min-h-screen bg-background flex">
      {/* Left pane — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Brand / school header */}
          <div className="mb-10 text-center">


            {schoolInfo ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black text-violet-400 shadow-inner">
                  {schoolInfo.name.charAt(0)}
                </div>
                <h1 className="text-2xl font-black text-foreground">{schoolInfo.name}</h1>
                <p className="text-foreground/40 text-sm mt-1">Staff &amp; Admin Portal</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black text-foreground">School Login</h1>
                <p className="text-foreground/40 text-sm mt-1 font-mono">/{slug}</p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/50 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                {...form.register("email")}
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-background/5 border border-foreground/10 text-foreground placeholder:text-foreground/25 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
              {form.formState.errors.email && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/50 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-background/5 border border-foreground/10 text-foreground placeholder:text-foreground/25 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all shadow-lg shadow-violet-500/25 mt-2"
            >
              {pending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Persistent login error banner */}
          {loginError && (
            <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 text-center">
              <p>{loginError}</p>
              {isVerifyError && (
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-3 text-xs text-violet-400 hover:underline disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend verification email →"}
                </button>
              )}
            </div>
          )}

          <div className="mt-8 text-center text-xs text-white/30 space-y-2">
            <p>
              Powered by{" "}
              <Link href="/" className="text-violet-400 hover:underline">
                EduNexus
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right pane — decorative (desktop only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-[#0a0a0f] relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="relative text-center space-y-6 px-12">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center">
            <School className="w-10 h-10 text-violet-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white leading-tight">
              Welcome to <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                {schoolInfo ? schoolInfo.name : "Your School"}
              </span>
            </h2>
            <p className="mt-4 text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
              {schoolInfo ? `Welcome to the secure portal for ${schoolInfo.name}. Please sign in to access your dashboard.` : "Welcome to the secure portal. Please sign in to access your dashboard."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
