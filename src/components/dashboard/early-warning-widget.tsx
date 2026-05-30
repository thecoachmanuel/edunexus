"use client";

import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EarlyWarningWidget() {
  const { data, isLoading } = useSWR("/ai/early-warning");

  if (isLoading) {
    return (
      <Card className="shadow-[0px_2px_4px_0px_rgba(0,0,0,0.02)] border-none dark:shadow-none">
        <CardContent className="p-6">
          <div className="h-24 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary || { highRisk: 0, atRisk: 0, stable: 0, total: 0 };
  const hasRisk = summary.highRisk > 0 || summary.atRisk > 0;

  return (
    <Card className={`shadow-[0px_2px_4px_0px_rgba(0,0,0,0.02)] hover:shadow-[0px_4px_8px_0px_rgba(0,0,0,0.04)] transition-shadow border-none dark:shadow-none overflow-hidden relative ${hasRisk ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10" : "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10"}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${hasRisk ? "bg-gradient-to-r from-amber-400 to-red-500" : "bg-gradient-to-r from-green-400 to-emerald-500"}`} />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${hasRisk ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
          {hasRisk ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          Early Warning System
        </CardTitle>
        <Link href="/academics/early-warning">
          <Button variant="ghost" size="sm" className={`h-7 text-xs gap-1 ${hasRisk ? "text-amber-700 hover:bg-amber-100 dark:text-amber-400" : "text-green-700 hover:bg-green-100 dark:text-green-400"}`}>
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="pb-5">
        {hasRisk ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {summary.highRisk + summary.atRisk} student{summary.highRisk + summary.atRisk !== 1 ? "s" : ""} need attention
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Based on attendance, grades & submission data
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.highRisk}</div>
                <div className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase">High Risk</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.atRisk}</div>
                <div className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase">At Risk</div>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-2.5 text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{summary.stable}</div>
                <div className="text-[10px] font-semibold text-green-500 dark:text-green-400 uppercase">Stable</div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">All {summary.total} students on track</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">No students flagged as at-risk</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
