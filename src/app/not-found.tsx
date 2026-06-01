"use client";

import Link from "next/link";
import { GraduationCap, ArrowRight, AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();
  // Extract slug from pathname (e.g. /springfield/lms/quizzes -> springfield)
  const segments = pathname.split("/").filter(Boolean);
  const possibleSlug = segments.length > 0 ? segments[0] : null;
  const isSaas = !possibleSlug || ["saas-admin", "pricing", "contact", "about"].includes(possibleSlug);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-8 h-8 text-violet-400" />
        </div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">404</h1>
        <h2 className="text-2xl font-bold mb-3">Page Not Found</h2>
        <p className="text-white/40 mb-8">
          The page you are looking for does not exist or may have been deactivated. Please check the URL or contact your school administrator.
        </p>
        
        {!isSaas ? (
          <Link
            href={`/${possibleSlug}/dashboard`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-violet-500/25"
          >
            Back to School Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-violet-500/25"
          >
            Go to EduNexus Homepage <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
