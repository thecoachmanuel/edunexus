"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { GraduationCap, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const school = searchParams.get("school");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!token || !school) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    axios.get(`/api/schools/verify-email?token=${token}&school=${school}`)
      .then(res => {
        setStatus("success");
        setMessage(res.data.message);
        setSlug(res.data.slug);
      })
      .catch(err => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed. Please try again.");
      });
  }, [token, school]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-12">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white">EduNexus</span>
        </Link>

        {status === "loading" && (
          <div>
            <Loader2 className="w-12 h-12 animate-spin text-violet-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Verifying your email...</h2>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Email Verified! 🎉</h2>
            <p className="text-white/50 mb-8">{message}</p>
            {slug && (
              <Link
                href={`/${slug}/login`}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-500/25"
              >
                Go to Your School Login <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Verification Failed</h2>
            <p className="text-white/50 mb-8">{message}</p>
            <Link href="/register" className="text-violet-400 hover:underline text-sm">
              Register a new account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
