"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Save, Download, RefreshCw, Lock, Unlock, ClipboardList } from "lucide-react";

const TERMS = ["Term 1", "Term 2", "Term 3"];

interface ResultRow {
  _id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  quizRawScore: number;
  caScore: number;
  examScore: number;
  aggregateScore?: number;
  grade?: string;
  remark?: string;
  quizLocked: boolean; // whether quiz is auto or overridden
}

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "B": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "C": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "D": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default:  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

export default function ResultsPage() {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const [config, setConfig] = useState<any>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load classes and subjects on mount
  useEffect(() => {
    if (!user || !year) return;
    const fetchMeta = async () => {
      try {
        const [clsRes, subRes] = await Promise.all([
          api.get("/classes?limit=1000"),
          api.get("/subjects?limit=1000"),
        ]);
        setClasses(clsRes.data.classes || []);
        // Teachers: filter to their subjects
        const allSubjects: any[] = subRes.data.subjects || [];
        if (isTeacher && user.teacherSubject) {
          const ids = (user.teacherSubject as any[]).map((s: any) => s._id || s);
          setSubjects(allSubjects.filter(s => ids.includes(s._id)));
        } else {
          setSubjects(allSubjects);
        }
      } catch {
        toast.error("Failed to load class/subject data");
      }
    };
    fetchMeta();
  }, [user, year, isTeacher]);

  const fetchResults = useCallback(async () => {
    if (!selectedClass || !year?._id) return;
    setLoading(true);
    setRows([]);
    setDirty(false);
    try {
      const { data } = await api.get(
        `/results?classId=${selectedClass}&academicYearId=${year._id}&term=${encodeURIComponent(selectedTerm)}`
      );
      setConfig(data.config);

      // Build rows from returned results
      const fetched: ResultRow[] = (data.results || []).map((r: any) => ({
        _id: r._id,
        studentId: r.student?._id || r.student,
        studentName: r.student?.name || "Unknown",
        subjectId: r.subject?._id || r.subject,
        quizRawScore: r.quizRawScore ?? 0,
        caScore: r.caScore ?? 0,
        examScore: r.examScore ?? 0,
        aggregateScore: r.aggregateScore ?? 0,
        grade: r.grade ?? "F",
        remark: r.remark ?? "",
        quizLocked: true,
      }));
      setRows(fetched);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, year?._id, selectedTerm]);

  useEffect(() => { if (selectedClass) fetchResults(); }, [selectedClass, selectedTerm, fetchResults]);

  const handlePopulateQuiz = async () => {
    if (!selectedClass || !year?._id) return;
    setPopulating(true);
    try {
      const { data } = await api.post("/results", {
        classId: selectedClass,
        academicYearId: year._id,
        term: selectedTerm,
      });
      toast.success(data.message);
      await fetchResults();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to populate quiz scores");
    } finally {
      setPopulating(false);
    }
  };

  const updateRow = (idx: number, field: "caScore" | "examScore" | "quizRawScore", value: number) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const toggleQuizLock = (idx: number) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], quizLocked: !next[idx].quizLocked };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedClass || !year?._id) return;
    setSaving(true);
    try {
      const payload = rows.map(r => ({
        studentId: r.studentId,
        subjectId: r.subjectId,
        quizRawScore: r.quizRawScore,
        caScore: r.caScore,
        examScore: r.examScore,
        caEnteredBy: user?._id,
        examEnteredBy: user?._id,
      }));
      const { data } = await api.put("/results", {
        classId: selectedClass,
        academicYearId: year._id,
        term: selectedTerm,
        results: payload,
      });
      toast.success(data.message);
      setDirty(false);
      await fetchResults(); // Refresh to get computed aggregates
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Get unique subjects from current rows for column grouping
  const subjectColumns = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      seen.set(r.subjectId, subjects.find(s => s._id === r.subjectId)?.name || r.subjectId);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [rows, subjects]);

  // Group rows by student for broadsheet
  const studentRows = useMemo(() => {
    const map = new Map<string, { name: string; bySubject: Record<string, ResultRow & { idx: number }> }>();
    rows.forEach((r, idx) => {
      if (!map.has(r.studentId)) map.set(r.studentId, { name: r.studentName, bySubject: {} });
      map.get(r.studentId)!.bySubject[r.subjectId] = { ...r, idx };
    });
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [rows]);

  // Filter by subject if teacher
  const visibleSubjects = selectedSubject === "all"
    ? subjectColumns
    : subjectColumns.filter(s => s.id === selectedSubject);

  const cfg = config ?? { quizMaxScore: 100, caMaxScore: 20, examMaxScore: 70 };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary" />
          Results Broadsheet
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter CA, Exam, and Quiz scores. Report cards update automatically on save.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(isAdmin || subjects.length > 1) && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Subject Filter</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePopulateQuiz}
                disabled={!selectedClass || populating}
                className="flex-1"
              >
                {populating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Populate Quiz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Info */}
      {config && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="outline">Quiz Weight: {config.quizWeight}% (max {config.quizMaxScore})</Badge>
          <Badge variant="outline">CA Weight: {config.caWeight}% (max {config.caMaxScore})</Badge>
          <Badge variant="outline">Exam Weight: {config.examWeight}% (max {config.examMaxScore})</Badge>
        </div>
      )}

      {/* Broadsheet Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedClass ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">Select a class to view the broadsheet</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="font-medium">No results yet. Click &quot;Populate Quiz&quot; to auto-fill quiz scores, then enter CA and Exam scores.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[160px] font-bold">Student</TableHead>
                  {visibleSubjects.map(sub => (
                    <TableHead key={sub.id} colSpan={5} className="text-center border-l font-semibold">
                      {sub.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-center border-l font-bold min-w-[80px]">Total Avg</TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 text-xs">
                  <TableHead className="sticky left-0 bg-muted/30 z-10" />
                  {visibleSubjects.map(sub => (
                    <>
                      <TableHead key={`${sub.id}-quiz`} className="text-center border-l text-xs py-1 text-muted-foreground">
                        Quiz<br/><span className="font-normal opacity-70">/{cfg.quizMaxScore}</span>
                      </TableHead>
                      <TableHead key={`${sub.id}-ca`} className="text-center text-xs py-1 text-muted-foreground">
                        CA<br/><span className="font-normal opacity-70">/{cfg.caMaxScore}</span>
                      </TableHead>
                      <TableHead key={`${sub.id}-exam`} className="text-center text-xs py-1 text-muted-foreground">
                        Exam<br/><span className="font-normal opacity-70">/{cfg.examMaxScore}</span>
                      </TableHead>
                      <TableHead key={`${sub.id}-total`} className="text-center text-xs py-1 text-muted-foreground font-semibold">
                        Total<br/><span className="font-normal opacity-70">/100</span>
                      </TableHead>
                      <TableHead key={`${sub.id}-agg`} className="text-center text-xs py-1 text-muted-foreground">
                        Grade
                      </TableHead>
                    </>
                  ))}
                  <TableHead className="border-l" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRows.map((student) => {
                  let totalAgg = 0;
                  let count = 0;
                  return (
                    <TableRow key={student.id} className="hover:bg-muted/5">
                      <TableCell className="sticky left-0 bg-background z-10 font-medium border-r shadow-sm">
                        {student.name}
                      </TableCell>
                      {visibleSubjects.map(sub => {
                        const entry = student.bySubject[sub.id];
                        if (!entry) {
                          return (
                            <>
                              <TableCell key={`${sub.id}-q`} className="border-l text-center text-xs text-muted-foreground">—</TableCell>
                              <TableCell key={`${sub.id}-c`} className="text-center text-xs text-muted-foreground">—</TableCell>
                              <TableCell key={`${sub.id}-e`} className="text-center text-xs text-muted-foreground">—</TableCell>
                              <TableCell key={`${sub.id}-t`} className="text-center text-xs text-muted-foreground">—</TableCell>
                              <TableCell key={`${sub.id}-g`} className="text-center text-xs text-muted-foreground">—</TableCell>
                            </>
                          );
                        }
                        if (entry.aggregateScore != null) { totalAgg += entry.aggregateScore; count++; }
                        return (
                          <>
                            {/* Quiz Score */}
                            <TableCell key={`${sub.id}-quiz-${student.id}`} className="border-l p-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={cfg.quizMaxScore}
                                  value={entry.quizRawScore}
                                  disabled={entry.quizLocked}
                                  onChange={e => updateRow(entry.idx, "quizRawScore", Number(e.target.value))}
                                  className="h-7 text-xs w-16 text-center disabled:opacity-60"
                                />
                                <button
                                  type="button"
                                  title={entry.quizLocked ? "Unlock to override" : "Lock to auto"}
                                  onClick={() => toggleQuizLock(entry.idx)}
                                  className="text-muted-foreground hover:text-primary shrink-0"
                                >
                                  {entry.quizLocked
                                    ? <Lock className="h-3 w-3" />
                                    : <Unlock className="h-3 w-3 text-primary" />
                                  }
                                </button>
                              </div>
                            </TableCell>
                            {/* CA Score */}
                            <TableCell key={`${sub.id}-ca-${student.id}`} className="p-1">
                              <Input
                                type="number"
                                min={0}
                                max={cfg.caMaxScore}
                                value={entry.caScore}
                                onChange={e => updateRow(entry.idx, "caScore", Number(e.target.value))}
                                className="h-7 text-xs w-16 text-center"
                              />
                            </TableCell>
                            {/* Exam Score */}
                            <TableCell key={`${sub.id}-exam-${student.id}`} className="p-1">
                              <Input
                                type="number"
                                min={0}
                                max={cfg.examMaxScore}
                                value={entry.examScore}
                                onChange={e => updateRow(entry.idx, "examScore", Number(e.target.value))}
                                className="h-7 text-xs w-16 text-center"
                              />
                            </TableCell>
                            {/* Total Score */}
                            <TableCell key={`${sub.id}-total-${student.id}`} className="text-center p-1 font-semibold text-sm">
                              {entry.aggregateScore ?? "—"}
                            </TableCell>
                            {/* Grade Badge */}
                            <TableCell key={`${sub.id}-grade-${student.id}`} className="text-center p-1">
                              {entry.grade ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gradeColor(entry.grade)}`}>
                                  {entry.grade}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                          </>
                        );
                      })}
                      <TableCell className="border-l text-center font-semibold text-sm">
                        {count > 0 ? Math.round(totalAgg / count) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Save Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              {dirty ? (
                <span className="text-amber-600 font-medium">Unsaved changes — report cards will update on save.</span>
              ) : (
                "All changes saved. Report cards are up to date."
              )}
            </p>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Broadsheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
