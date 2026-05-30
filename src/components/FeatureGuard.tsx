"use client";

import { ReactNode } from "react";
import { Lock, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/AuthProvider";
import { useParams } from "next/navigation";

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
}

export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const { user } = useAuth();
  const params = useParams();

  // If we don't have the user object yet or if it doesn't have features, assume allowed temporarily
  // to prevent flickering. Ideally, features are loaded with the user.
  const features = (user as any)?.schoolContext?.features || ["attendance", "grading", "basic_reports"];
  const hasFeature = features.includes(feature) || features.includes("all");

  if (!hasFeature) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh] max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Feature Locked</h2>
        <p className="text-muted-foreground mb-6">
          The <strong>{feature.replace("_", " ")}</strong> feature is not included in your current plan. Upgrade your subscription to unlock this capability and supercharge your school.
        </p>
        <Link 
          href={`/${params.slug}/billing`}
          className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition flex items-center gap-2 shadow-lg shadow-violet-500/25"
        >
          View Plans & Upgrade <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
