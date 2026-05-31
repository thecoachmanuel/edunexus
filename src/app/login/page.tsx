"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function FindSchoolLogin() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Check if school exists
      await axios.get(`/api/schools/${slug.trim()}`);
      router.push(`/${slug.trim()}`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("School not found. Please check the spelling.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">>
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            EduNexus
          </span>
        </Link>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <Building2 className="w-6 h-6 text-violet-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Find your school</h2>
          <p className="text-white/50 text-center text-sm mb-6">
            Enter your school's unique EduNexus ID (slug) to continue to your login portal.
          </p>

          <form onSubmit={handleGo} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setError(""); }}
                placeholder="e.g. greenfield-academy"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all text-white placeholder:text-white/20"
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !slug.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Finding..." : "Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          Are you a school administrator looking to join? <br />
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
