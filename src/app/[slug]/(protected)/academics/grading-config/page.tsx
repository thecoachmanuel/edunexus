"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, PlusCircle, Trash2, Settings2 } from "lucide-react";

const TERMS = ["Term 1", "Term 2", "Term 3"];

interface FormValues {
  term: string;
  quizWeight: number;
  caWeight: number;
  examWeight: number;
  quizMaxScore: number;
  caMaxScore: number;
  examMaxScore: number;
  showPositionOnReportCard: boolean;
  gradeThresholds: { grade: string; minScore: number; remark: string }[];
}

export default function GradingConfigPage() {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      term: "Term 1",
      quizWeight: 10,
      caWeight: 20,
      examWeight: 70,
      quizMaxScore: 100,
      caMaxScore: 20,
      examMaxScore: 70,
      showPositionOnReportCard: true,
      gradeThresholds: [
        { grade: "A", minScore: 75, remark: "Distinction" },
        { grade: "B", minScore: 60, remark: "Credit" },
        { grade: "C", minScore: 50, remark: "Merit" },
        { grade: "D", minScore: 40, remark: "Pass" },
        { grade: "F", minScore: 0,  remark: "Fail" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gradeThresholds",
  });

  const quizW = form.watch("quizWeight");
  const caW = form.watch("caWeight");
  const examW = form.watch("examWeight");
  const term = form.watch("term");
  const total = Number(quizW) + Number(caW) + Number(examW);

  const fetchConfig = useCallback(async () => {
    if (!year?._id || !term) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/grading-config?academicYearId=${year._id}&term=${encodeURIComponent(term)}`);
      if (data.config) {
        const c = data.config;
        form.reset({
          term: c.term,
          quizWeight: c.quizWeight,
          caWeight: c.caWeight,
          examWeight: c.examWeight,
          quizMaxScore: c.quizMaxScore,
          caMaxScore: c.caMaxScore,
          examMaxScore: c.examMaxScore,
          showPositionOnReportCard: c.showPositionOnReportCard,
          gradeThresholds: c.gradeThresholds,
        });
      }
    } catch {
      // No config yet — defaults are fine
    } finally {
      setLoading(false);
    }
  }, [year?._id, term, form]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const onSubmit = async (values: FormValues) => {
    if (total !== 100) {
      toast.error("Quiz + CA + Exam weights must equal 100");
      return;
    }
    setSaving(true);
    try {
      await api.post("/grading-config", { ...values, academicYearId: year?._id });
      toast.success("Grading configuration saved!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-muted-foreground">
        Only administrators can configure grading settings.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-7 w-7 text-primary" />
          Grading Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure score weights, grade thresholds, and report card preferences per term.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Term selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Term</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={form.control}
              name="term"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Score Weights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Score Component Weights</CardTitle>
                <CardDescription>
                  Weights must total exactly 100. The aggregate score is computed as:
                  (Quiz/QuizMax × QuizWeight) + (CA/CAMax × CAWeight) + (Exam/ExamMax × ExamWeight)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-end">
                  <Badge
                    variant={total === 100 ? "default" : "destructive"}
                    className="text-sm px-3 py-1"
                  >
                    Total: {total} / 100 {total === 100 ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(["quiz", "ca", "exam"] as const).map((key) => (
                    <div key={key} className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-sm capitalize">
                        {key === "ca" ? "Continuous Assessment" : key === "quiz" ? "Quiz (Auto)" : "Main Exam"}
                      </h4>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Weight (out of 100)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...form.register(`${key}Weight` as any, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Max Raw Score</Label>
                        <Input
                          type="number"
                          min={1}
                          {...form.register(`${key}MaxScore` as any, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grade Thresholds */}
            <Card>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Grade Thresholds</CardTitle>
                  <CardDescription>
                    Define letter grades and the minimum aggregate score to achieve them.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ grade: "", minScore: 0, remark: "" })}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center border-b sm:border-0 pb-4 sm:pb-0 mb-4 sm:mb-0 last:border-0 last:mb-0 last:pb-0">
                    <Input
                      placeholder="Grade (e.g. A)"
                      {...form.register(`gradeThresholds.${idx}.grade`)}
                    />
                    <Input
                      type="number"
                      placeholder="Min Score"
                      min={0}
                      max={100}
                      {...form.register(`gradeThresholds.${idx}.minScore`, { valueAsNumber: true })}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Remark"
                        {...form.register(`gradeThresholds.${idx}.remark`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Report Card Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Report Card Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Show Class Position</p>
                    <p className="text-xs text-muted-foreground">
                      Display the student&apos;s position (e.g. 3rd out of 24) on printed report cards.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="showPositionOnReportCard"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={saving || total !== 100} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
