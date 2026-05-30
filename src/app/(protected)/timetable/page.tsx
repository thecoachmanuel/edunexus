"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import type { schedule } from "@/types";
import GeneratorControls, {
  type GenSettings,
} from "@/components/timetable/GeneratorControls";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import TimetableStatistics from "@/components/timetable/TimetableStatistics";

import { Button } from "@/components/ui/button";
import { Printer, Trash2, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const isViewOnly = isStudent || isParent;

  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateAllProgress, setGenerateAllProgress] = useState({ current: 0, total: 0, currentClassName: "" });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");
  const [teachers, setTeachers] = useState<{_id: string; name: string}[]>([]);
  // Track the currently-viewed term so fetchTimetable always fetches the right one
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [parentClasses, setParentClasses] = useState<{_id: string; name: string}[]>([]);
  const [lastUsedSettings, setLastUsedSettings] = useState<{yearId: string, settings: GenSettings} | null>(null);
  const [currentSettings, setCurrentSettings] = useState<{yearId: string, settings: GenSettings} | null>(null);

  useEffect(() => {
    if (isTeacher) setViewMode("teacher");
    if (isAdmin) {
      api.get("/users?role=teacher").then(({ data }) => {
        setTeachers(data.users || []);
      }).catch(() => {});
    }
  }, [isTeacher, isAdmin]);

  // For parents: auto-load their children's classes
  useEffect(() => {
    if (!user || !isParent) return;
    api.get("/parent/portal").then(({ data }) => {
      const classes = (data.children || [])
        .filter((c: any) => c.className && c._id)
        .map((c: any) => ({ _id: c.classId || c._id, name: `${c.name} (${c.className})` }));
      setParentClasses(classes);
      // Auto-select first child's class
      if (classes.length > 0) setSelectedClass(classes[0]._id);
    }).catch(() => {});
  }, [user, isParent]);

  // fetch timetable — accepts an optional term override so post-generate fetch
  // always retrieves the term that was just generated.
  const fetchTimetable = async (id: string, mode: "class" | "teacher", term?: string) => {
    if (!id && mode === "class") return;

    try {
      setLoadingSchedule(true);
      const termParam = term || selectedTerm;
      const url = mode === "class"
        ? (termParam ? `/timetables/${id}?term=${encodeURIComponent(termParam)}` : `/timetables/${id}`)
        : `/timetables/teacher/${id}`;
        
      const { data } = await api.get(url);
      setScheduleData(data.schedule || []);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setScheduleData([]);
        if (!isAdmin) {
          toast("No schedule found", { icon: "📅" });
        }
      } else {
        toast.error("Failed to load timetable");
      }
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleClear = async () => {
    if (!selectedClass) return;
    if (!confirm("Are you sure you want to clear the timetable for this class?")) return;

    try {
      const termParam = selectedTerm
        ? `?term=${encodeURIComponent(selectedTerm)}`
        : "";
      await api.delete(`/timetables/${selectedClass}${termParam}`);
      toast.success("Timetable cleared successfully");
      setScheduleData([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to clear timetable");
    }
  };

  // auto fetch when selection changes
  useEffect(() => {
    if (viewMode === "teacher" && isTeacher) {
      fetchTimetable("me", "teacher");
    } else if (viewMode === "teacher" && selectedTeacher) {
      fetchTimetable(selectedTeacher, "teacher");
    } else if (viewMode === "class" && selectedClass) {
      fetchTimetable(selectedClass, "class");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedTeacher, viewMode, isTeacher]);

  const handleGenerate = async (
    classId: string,
    yearId: string,
    settings: GenSettings
  ) => {
    try {
      setLastUsedSettings({ yearId, settings });
      setIsGenerating(true);
      // Keep track of the term being generated so we can fetch it after
      setSelectedTerm(settings.term);

      const { data } = await api.post("/timetables/generate", {
        classId,
        academicYearId: yearId,
        term: settings.term,
        settings,
      });

      toast.success(data.message || "Timetable generated successfully!");
      // Fetch using the exact term just generated
      await fetchTimetable(classId, "class", settings.term);
      setIsGenerating(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async (yearId: string, settings: GenSettings) => {
    try {
      // Fetch all classes
      const { data } = await api.get("/classes?limit=1000");
      const classesToGenerate = data.classes || [];
      
      if (classesToGenerate.length === 0) {
        toast.error("No classes found to generate timetables for.");
        return;
      }
      
      if (!confirm(`Are you sure you want to generate timetables for all ${classesToGenerate.length} classes sequentially? This will take a few minutes.`)) {
        return;
      }

      setIsGeneratingAll(true);
      setLastUsedSettings({ yearId, settings });
      setSelectedTerm(settings.term);
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < classesToGenerate.length; i++) {
        const cls = classesToGenerate[i];
        setGenerateAllProgress({ current: i + 1, total: classesToGenerate.length, currentClassName: cls.name });
        
        try {
          await api.post("/timetables/generate", {
            classId: cls._id,
            academicYearId: yearId,
            term: settings.term,
            settings,
          });
          successCount++;
        } catch (error: any) {
          if (error.response?.status === 429) {
            toast.warning("AI Quota Limit hit! Pausing for 60 seconds before retrying this class...", { duration: 10000 });
            await new Promise(resolve => setTimeout(resolve, 60000));
            i--; // Retry the same class
            continue;
          } else {
            console.error(`Failed to generate for ${cls.name}:`, error);
            failCount++;
          }
        }
        
        // Add a 5 second delay between successful requests to prevent hitting rate limits
        if (i < classesToGenerate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (failCount === 0) {
        toast.success(`Successfully generated all ${successCount} timetables!`);
      } else {
        toast.warning(`Generated ${successCount} timetables, but ${failCount} failed. Check console for details.`);
      }
      
      // Refresh the currently selected class timetable
      if (selectedClass) {
        await fetchTimetable(selectedClass, "class", settings.term);
      }
    } catch (error: any) {
      toast.error("Bulk generation failed to start.");
    } finally {
      setIsGeneratingAll(false);
      setGenerateAllProgress({ current: 0, total: 0, currentClassName: "" });
    }
  };

  const handleRegenerateWithWeights = async (weights: Record<string, number>) => {
    const baseSettings = lastUsedSettings || currentSettings;
    if (!baseSettings) {
      toast.error("Please configure timetable settings first");
      return;
    }
    const newSettings = { ...baseSettings.settings, subjectWeights: weights };
    await handleGenerate(selectedClass, baseSettings.yearId, newSettings);
  };

  // When settings change in GeneratorControls, keep the local term in sync
  const handleSettingsChange = (data: { yearId: string; settings: GenSettings }) => {
    setCurrentSettings(data);
    setSelectedTerm(data.settings.term);
  };

  return (
    <div className="p-4 space-y-6 print:p-0 print:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Timetable Management
          </h1>
          <p className="text-muted-foreground print:hidden">
            {isStudent
              ? "View your weekly class schedule."
              : isParent
              ? "View your children's weekly class schedule."
              : "View or manage weekly schedules."}
          </p>
        </div>
        {scheduleData.length > 0 && (
          <div className="flex items-center gap-2 print:hidden">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Timetable
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-2 print:hidden mb-4">
          <Button variant={viewMode === "class" ? "default" : "outline"} onClick={() => setViewMode("class")}>Class View</Button>
          <Button variant={viewMode === "teacher" ? "default" : "outline"} onClick={() => setViewMode("teacher")}>Teacher View</Button>
        </div>
      )}
      {!isViewOnly && viewMode === "class" && (
        <div className="print:hidden">
          <GeneratorControls
            onGenerate={handleGenerate}
            onGenerateAll={handleGenerateAll}
            onClassChange={(classId) => fetchTimetable(classId, "class")}
            isGenerating={isGenerating}
            isGeneratingAll={isGeneratingAll}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      )}
      {isAdmin && viewMode === "teacher" && (
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium shrink-0">Select Teacher:</span>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Parent class picker */}
      {isParent && parentClasses.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium shrink-0">View schedule for:</span>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); fetchTimetable(v, "class"); }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {parentClasses.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      <TimetableGrid 
        schedule={scheduleData} 
        isLoading={loadingSchedule} 
        isAdmin={isAdmin}
        classId={selectedClass}
        isTeacherView={viewMode === "teacher"}
        onPeriodUpdated={() => viewMode === "class" ? fetchTimetable(selectedClass, "class") : fetchTimetable(selectedTeacher || "me", "teacher")}
      />
      {!isViewOnly && viewMode === "class" && scheduleData.length > 0 && (
        <div className="print:hidden">
          <TimetableStatistics 
            scheduleData={scheduleData} 
            onRegenerateWithWeights={handleRegenerateWithWeights} 
            isGenerating={isGenerating}
            isAdmin={isAdmin}
          />
        </div>
      )}
      
      {/* Progress Modal Overlay for Bulk Generation */}
      {isGeneratingAll && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle>Bulk Generating Timetables</CardTitle>
              <CardDescription>Generating school schedule class by class to prevent teacher clashes. Please do not close this window.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span>Class: <span className="text-primary">{generateAllProgress.currentClassName}</span></span>
                <span>{generateAllProgress.current} / {generateAllProgress.total}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out" 
                  style={{ width: `${(generateAllProgress.current / Math.max(1, generateAllProgress.total)) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>AI is optimizing schedules sequentially...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Timetable;
