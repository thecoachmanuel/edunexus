"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Sparkles, 
  Loader2, X, ChevronDown, ChevronUp, Users, 
  TrendingDown, BookOpen, CalendarX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type RiskLevel = "high" | "at_risk" | "stable";

interface RiskFactor {
  label: string;
  severity: "high" | "medium";
  points: number;
}

interface AtRiskStudent {
  _id: string;
  name: string;
  email: string;
  class: { name: string } | null;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  attendanceRate: number;
  latestAverage: number | null;
  latestGrade: string | null;
  latestTerm: string | null;
}

const RISK_CONFIG = {
  high: {
    label: "High Risk",
    color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    border: "border-red-200 dark:border-red-500/20",
    icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
    dot: "bg-red-500",
  },
  at_risk: {
    label: "At Risk",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/20",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    dot: "bg-amber-500",
  },
  stable: {
    label: "Stable",
    color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    border: "border-green-200 dark:border-green-500/20",
    icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
    dot: "bg-green-500",
  },
};

export default function EarlyWarningPage() {
  const { user } = useAuth();
  const { data, isLoading } = useSWR(user ? "/ai/early-warning" : null);
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
  const [plan, setPlan] = useState<string>("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const students: AtRiskStudent[] = data?.students || [];
  const summary = data?.summary || { highRisk: 0, atRisk: 0, stable: 0, total: 0 };

  const filtered = filter === "all" ? students : students.filter(s => s.riskLevel === filter);

  const handleGeneratePlan = async (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setPlan("");
    setPlanModalOpen(true);
    setGeneratingPlan(true);
    try {
      const { data } = await api.get(`/ai/early-warning/${student._id}`);
      setPlan(data.plan);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to generate plan");
      setPlanModalOpen(false);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
          Early Warning System
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered risk assessment to identify students who need support before they fall behind.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer border-2 transition-all ${filter === "all" ? "border-primary shadow-md" : "border-transparent hover:border-muted"}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-primary mx-auto mb-1" />
            <div className="text-3xl font-bold">{summary.total}</div>
            <div className="text-xs text-muted-foreground font-semibold uppercase">Total Students</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer border-2 transition-all ${filter === "high" ? "border-red-500 shadow-md" : "border-transparent hover:border-muted"}`}
          onClick={() => setFilter(filter === "high" ? "all" : "high")}
        >
          <CardContent className="p-4 text-center">
            <ShieldAlert className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.highRisk}</div>
            <div className="text-xs text-red-500 font-semibold uppercase">High Risk</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer border-2 transition-all ${filter === "at_risk" ? "border-amber-500 shadow-md" : "border-transparent hover:border-muted"}`}
          onClick={() => setFilter(filter === "at_risk" ? "all" : "at_risk")}
        >
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.atRisk}</div>
            <div className="text-xs text-amber-500 font-semibold uppercase">At Risk</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer border-2 transition-all ${filter === "stable" ? "border-green-500 shadow-md" : "border-transparent hover:border-muted"}`}
          onClick={() => setFilter(filter === "stable" ? "all" : "stable")}
        >
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.stable}</div>
            <div className="text-xs text-green-500 font-semibold uppercase">Stable</div>
          </CardContent>
        </Card>
      </div>

      {/* Hint */}
      <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-lg p-3 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
        <p className="text-sm text-violet-700 dark:text-violet-300">
          Risk scores are calculated from real attendance, grade trends, and quiz submission data. Click any student to see their risk factors, then generate an AI-powered intervention plan.
        </p>
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-lg">No students in this category</p>
          </div>
        )}
        {filtered.map((student) => {
          const config = RISK_CONFIG[student.riskLevel];
          const isExpanded = expandedId === student._id;

          return (
            <div 
              key={student._id} 
              className={`bg-card border-2 ${config.border} rounded-xl overflow-hidden transition-all`}
            >
              {/* Row */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : student._id)}
              >
                {/* Risk dot */}
                <div className={`h-3 w-3 rounded-full shrink-0 ${config.dot} ring-4 ${config.dot.replace("bg-", "ring-")}/20`} />
                
                {/* Student info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{student.name}</span>
                    <Badge className={`text-[10px] font-bold uppercase ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {student.class?.name || "No Class"} 
                    {student.latestTerm && ` · Last term: ${student.latestTerm}`}
                  </p>
                </div>

                {/* Quick stats */}
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <div className={`text-sm font-bold ${student.attendanceRate < 75 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                      {student.attendanceRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Attendance</div>
                  </div>
                  {student.latestAverage !== null && (
                    <div className="text-center">
                      <div className={`text-sm font-bold ${(student.latestAverage ?? 0) < 50 ? "text-red-500" : (student.latestAverage ?? 0) < 60 ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
                        {student.latestAverage}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Avg Score</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-sm font-bold text-foreground">{student.riskScore}</div>
                    <div className="text-[10px] text-muted-foreground">Risk Score</div>
                  </div>
                </div>

                {/* Expand toggle */}
                <div className="text-muted-foreground shrink-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-dashed border-border px-4 pb-4 pt-3 space-y-3 bg-muted/20">
                  {/* Mobile stats */}
                  <div className="flex md:hidden items-center gap-4 mb-2">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${student.attendanceRate < 75 ? "text-red-500" : "text-green-600"}`}>
                        {student.attendanceRate}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Attendance</div>
                    </div>
                    {student.latestAverage !== null && (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${(student.latestAverage ?? 0) < 50 ? "text-red-500" : "text-amber-500"}`}>
                          {student.latestAverage}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">Avg Score</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Factors Detected</p>
                    <div className="space-y-1.5">
                      {student.riskFactors.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No risk factors detected.</p>
                      ) : student.riskFactors.map((factor, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-md ${factor.severity === "high" ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                          {factor.severity === "high" 
                            ? <TrendingDown className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          }
                          {factor.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {student.riskLevel !== "stable" && (
                    <Button
                      size="sm"
                      className="gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white"
                      onClick={() => handleGeneratePlan(student)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate AI Intervention Plan
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Intervention Plan Modal */}
      <Dialog open={planModalOpen} onOpenChange={(o) => { if (!o) { setPlanModalOpen(false); } }}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Intervention Plan — {selectedStudent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {generatingPlan ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
                  <Sparkles className="h-5 w-5 text-violet-600 absolute inset-0 m-auto" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Analysing student data and generating a personalised intervention plan…
                </p>
              </div>
            ) : plan ? (
              <div className="space-y-4">
                <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase mb-2 flex items-center gap-1.5 shrink-0">
                    <Sparkles className="h-3.5 w-3.5" /> AI Recommendation
                  </p>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {plan}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center italic">
                  Generated by Gemini AI · Based on attendance, grades and submission data
                </p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
