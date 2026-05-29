"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, Search, Trash2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportCardView } from "@/components/academics/ReportCardView";

export default function ReportsPage() {
  const { user, year } = useAuth();
  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";

  const [reports, setReports] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // View & Selection state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filterForm = useForm({
    defaultValues: {
      classId: "all",
      term: "Term 1",
    },
  });

  const generateForm = useForm({
    defaultValues: {
      classId: "",
      term: "Term 1",
    },
  });

  const fetchReports = async (classId?: string) => {
    try {
      setLoading(true);
      let url = "/reports";
      if (classId) url += `?classId=${classId}`;
      const { data } = await api.get(url);
      setReports(data.reports);
    } catch (error) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't run until auth context has resolved and user role is known
    if (!user) return;

    const loadClasses = async () => {
      if (!isAdminOrTeacher) return;
      try {
        const { data } = await api.get("/classes?limit=1000");
        setClasses(data.classes || []);
      } catch (error) {
        toast.error("Failed to load classes");
      }
    };

    loadClasses();
    fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onFilter = filterForm.handleSubmit((data) => {
    fetchReports(data.classId === "all" ? undefined : data.classId);
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report card?")) return;
    try {
      await api.delete(`/reports/${id}`);
      toast.success("Report card deleted successfully");
      fetchReports(filterForm.getValues().classId === "all" ? undefined : filterForm.getValues().classId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete report card");
    }
  };

  const handleBatchDeleteByTerm = async () => {
    const { classId, term } = generateForm.getValues();
    if (!classId) return toast.error("Select a class to clear");
    if (!confirm(`Are you sure you want to delete ALL report cards for ${term} in this class?`)) return;
    
    setDeleting(true);
    try {
      const res = await api.delete('/reports', { data: { classId, term } });
      toast.success(`Deleted ${res.data.count} report cards`);
      fetchReports(filterForm.getValues().classId === "all" ? undefined : filterForm.getValues().classId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to batch delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected report cards?`)) return;
    
    setDeleting(true);
    try {
      const res = await api.delete('/reports', { data: { ids: selectedIds } });
      toast.success(`Deleted ${res.data.count} report cards`);
      setSelectedIds([]);
      fetchReports(filterForm.getValues().classId === "all" ? undefined : filterForm.getValues().classId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete selected");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const onGenerate = generateForm.handleSubmit(async (data) => {
    if (!year) {
      toast.error("No active academic year found");
      return;
    }
    if (!data.classId) {
      toast.error("Please select a class");
      return;
    }
    try {
      setGenerating(true);
      const res = await api.post("/reports", {
        classId: data.classId,
        academicYearId: year._id,
        term: data.term,
      });
      toast.success(`Generated ${res.data.count} report cards!`);
      // refresh the view for that class
      filterForm.setValue("classId", data.classId);
      fetchReports(data.classId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate reports");
    } finally {
      setGenerating(false);
    }
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Cards</h1>
          <p className="text-muted-foreground">
            View and generate academic report cards for students.
          </p>
        </div>
      </div>

      {isAdminOrTeacher && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md border flex flex-col md:flex-row gap-8">
          {/* Generation Section */}
          <div className="flex-1 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> Generate Reports
            </h2>
            <form onSubmit={onGenerate} className="flex flex-col sm:flex-row flex-wrap gap-4 sm:items-end">
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
                <Controller
                  name="classId"
                  control={generateForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Term</label>
                <Controller
                  name="term"
                  control={generateForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="submit" disabled={generating || deleting} className="flex-1 sm:flex-none">
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate
                </Button>
                <Button type="button" variant="destructive" onClick={handleBatchDeleteByTerm} disabled={generating || deleting} className="flex-1 sm:flex-none">
                  Clear Term
                </Button>
              </div>
            </form>
          </div>

          <div className="hidden md:block w-px bg-border" />

          {/* Filter Section */}
          <div className="flex-1 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" /> Filter Reports
            </h2>
            <form onSubmit={onFilter} className="flex flex-col sm:flex-row flex-wrap gap-4 sm:items-end">
              <div className="w-full sm:w-48">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
                <Controller
                  name="classId"
                  control={filterForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((c) => (
                          <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">Filter</Button>
                {selectedIds.length > 0 && (
                  <Button type="button" variant="destructive" onClick={handleDeleteSelected} disabled={deleting} className="flex-1 sm:flex-none">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-md">
            No report cards found. Generate some above.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report._id} className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow relative">
              {isAdminOrTeacher && (
                <div className="absolute top-4 right-4">
                  <Checkbox 
                    checked={selectedIds.includes(report._id)} 
                    onCheckedChange={() => toggleSelection(report._id)} 
                  />
                </div>
              )}
              <div className="flex justify-between items-start mb-2 pr-6">
                <h3 className="font-semibold truncate pr-2">{report.student?.name}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                  {report.overallGrade} ({report.averageScore}%)
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {report.class?.name} • {report.term}
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedReport(report)}
                >
                  View Report Card
                </Button>
                {isAdminOrTeacher && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(report._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95vw] sm:w-full">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          <div className="print:block overflow-x-auto w-full pb-4" id="printable-report">
            {selectedReport && <ReportCardView report={selectedReport} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
