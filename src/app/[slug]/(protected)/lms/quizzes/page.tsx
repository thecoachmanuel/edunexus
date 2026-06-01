"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Plus, FileText, Clock, Users, Trash2, Search,
  BookOpen, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  CalendarDays, Loader2, LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import type { exam } from "@/types";
import { toast } from "sonner";
import QuizGenerator from "@/components/lms/QuizGenerator";
import useSWR from "swr";

const PAGE_SIZE = 9;

type TabKey = "all" | "active" | "inactive";

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType; isActiveParam: string | null }[] = [
  { key: "all",      label: "All Quizzes", icon: LayoutGrid,    isActiveParam: null    },
  { key: "active",   label: "Active",      icon: CheckCircle2,  isActiveParam: "true"  },
  { key: "inactive", label: "Inactive",    icon: XCircle,       isActiveParam: "false" },
];

function buildUrl(tab: TabKey, page: number, search: string) {
  const cfg = TAB_CONFIG.find((t) => t.key === tab)!;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (cfg.isActiveParam !== null) params.set("isActive", cfg.isActiveParam);
  if (search.trim()) params.set("search", search.trim());
  return `/exams?${params.toString()}`;
}

// ── Status helpers ──────────────────────────────────────────────────────────
function getStatus(exam: exam) {
  const overdue = new Date(exam.dueDate) < new Date();
  return exam.isActive && !overdue ? "active" : "inactive";
}

const STATUS_STYLES = {
  active: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    border: "border-l-4 border-l-emerald-500",
    glow: "hover:shadow-emerald-100 dark:hover:shadow-emerald-950",
    dot: "bg-emerald-500",
    label: "Active",
  },
  inactive: {
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    border: "border-l-4 border-l-rose-400",
    glow: "hover:shadow-rose-100 dark:hover:shadow-rose-950",
    dot: "bg-rose-400",
    label: "Inactive",
  },
};

// ── Pagination component ─────────────────────────────────────────────────────
function Pagination({
  page, pages, onPage,
}: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;

  const items: (number | "…")[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) items.push(i);
  } else {
    items.push(1);
    if (page > 3) items.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) items.push(i);
    if (page < pages - 2) items.push("…");
    items.push(pages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Button
        variant="outline" size="icon"
        onClick={() => onPage(page - 1)} disabled={page === 1}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {items.map((item, i) =>
        item === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "default" : "outline"}
            size="icon"
            onClick={() => onPage(item as number)}
            className="h-8 w-8 text-sm"
          >
            {item}
          </Button>
        )
      )}

      <Button
        variant="outline" size="icon"
        onClick={() => onPage(page + 1)} disabled={page === pages}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ tab, search }: { tab: TabKey; search: string }) {
  const cfg = TAB_CONFIG.find((t) => t.key === tab)!;
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className={`p-4 rounded-full mb-4 ${tab === "active" ? "bg-emerald-50 dark:bg-emerald-950" : tab === "inactive" ? "bg-rose-50 dark:bg-rose-950" : "bg-muted"}`}>
        <BookOpen className={`h-10 w-10 ${tab === "active" ? "text-emerald-400" : tab === "inactive" ? "text-rose-400" : "text-muted-foreground"}`} />
      </div>
      <h3 className="font-semibold text-lg mb-1">
        {search ? "No results found" : `No ${tab === "all" ? "" : cfg.label.toLowerCase()} quizzes yet`}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        {search
          ? `No quizzes match "${search}". Try a different search term.`
          : tab === "active"
          ? "No quizzes are currently active. Create one to get started!"
          : tab === "inactive"
          ? "All quizzes are currently active — nothing inactive."
          : "No quizzes found. Click \"New AI Quiz\" to create one."}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const Quizzes = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();

  // Debounce search input
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(timer);
  }, []);

  const swrKey = user ? buildUrl(tab, page, debouncedSearch) : null;
  const { data, mutate, isLoading } = useSWR(swrKey);
  const exams: exam[] = data?.exams || [];
  const pagination = data?.pagination;

  const handleTabChange = (value: string) => {
    setTab(value as TabKey);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success("Quiz deleted");
      mutate();
    } catch {
      toast.error("Failed to delete quiz");
    }
  };

  // ── Count badges per tab ────────────────────────────────────────────────
  const { data: countAll } = useSWR(user ? `/exams?limit=1&page=1` : null);
  const { data: countActive } = useSWR(user ? `/exams?limit=1&page=1&isActive=true` : null);
  const { data: countInactive } = useSWR(user ? `/exams?limit=1&page=1&isActive=false` : null);
  const counts: Record<TabKey, number | undefined> = {
    all: countAll?.pagination?.total,
    active: countActive?.pagination?.total,
    inactive: countInactive?.pagination?.total,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage assessments and view results.
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => setIsGenOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> New AI Quiz
          </Button>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="h-auto p-1 gap-1">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className={`gap-2 text-sm data-[state=active]:shadow-sm ${
                  key === "active"
                    ? "data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950 dark:data-[state=active]:text-emerald-300"
                    : key === "inactive"
                    ? "data-[state=active]:text-rose-700 data-[state=active]:bg-rose-50 dark:data-[state=active]:bg-rose-950 dark:data-[state=active]:text-rose-300"
                    : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {counts[key] !== undefined && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    key === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                      : key === "inactive"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {counts[key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search quizzes..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {TAB_CONFIG.map(({ key }) => (
          <TabsContent key={key} value={key} className="mt-0 outline-none">
            {/* ── Loading skeleton ── */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card animate-pulse h-52" />
                ))}
              </div>
            ) : exams.length === 0 ? (
              <div className="grid grid-cols-1">
                <EmptyState tab={tab} search={debouncedSearch} />
              </div>
            ) : (
              <>
                {/* ── Summary bar ── */}
                <p className="text-xs text-muted-foreground mb-4">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination?.total ?? 0)} of{" "}
                  <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span> quiz
                  {(pagination?.total ?? 0) !== 1 ? "es" : ""}
                </p>

                {/* ── Cards grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.map((exam) => {
                    const status = getStatus(exam);
                    const styles = STATUS_STYLES[status];
                    const overdue = new Date(exam.dueDate) < new Date();

                    return (
                      <Card
                        key={exam._id}
                        className={`group relative flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg ${styles.border} ${styles.glow}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            {/* Status badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot} animate-${status === "active" ? "pulse" : "none"}`} />
                                {styles.label}
                              </span>
                              {overdue && status === "inactive" && (
                                <span className="text-[10px] text-rose-500 font-medium">Overdue</span>
                              )}
                            </div>

                            {/* Delete button */}
                            {isTeacher && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(exam._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <CardTitle className="mt-2 text-base leading-snug line-clamp-2">
                            {exam.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground pb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{exam.subject?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{exam.class?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{exam.duration} mins</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>Due {new Date(exam.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-0">
                          <Button
                            variant={!isTeacher && exam.hasSubmitted ? "secondary" : "outline"}
                            className={`w-full h-8 text-sm transition-all ${
                              status === "active" && !isTeacher
                                ? "border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
                                : ""
                            }`}
                            onClick={() => router.push(`/${params.slug}/lms/quizzes/${exam._id}`)}
                          >
                            {isTeacher ? "Manage Questions" : exam.hasSubmitted ? "View Results" : "Start Quiz"}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                <Pagination
                  page={page}
                  pages={pagination?.pages ?? 1}
                  onPage={setPage}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <QuizGenerator
        open={isGenOpen}
        onOpenChange={setIsGenOpen}
        onSuccess={() => mutate()}
      />
    </div>
  );
};

export default Quizzes;
