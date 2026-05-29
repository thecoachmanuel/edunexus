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
import { Printer, Trash2 } from "lucide-react";

const Timetable = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";

  const [scheduleData, setScheduleData] = useState<schedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [lastUsedSettings, setLastUsedSettings] = useState<{yearId: string, settings: GenSettings} | null>(null);
  const [currentSettings, setCurrentSettings] = useState<{yearId: string, settings: GenSettings} | null>(null);

  // fetch timetable
  const fetchTimetable = async (classId: string) => {
    if (!classId) return;

    try {
      setLoadingSchedule(true);
      const { data } = await api.get(`/timetables/${classId}`);
      setScheduleData(data.schedule || []);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        setScheduleData([]);
        if (!isAdmin) {
          // Only show toast if user isn't admin (admins expect empty on new classes)
          toast("No schedule found for this class", { icon: "📅" });
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
      await api.delete(`/timetables/${selectedClass}`);
      toast.success("Timetable cleared successfully");
      setScheduleData([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to clear timetable");
    }
  };

  // auto fetch using useEffect
  useEffect(() => {
    if (selectedClass) {
      fetchTimetable(selectedClass);
    }
  }, [selectedClass]);

  const handleGenerate = async (
    selectedClass: string,
    yearId: string,
    settings: GenSettings
  ) => {
    try {
      setLastUsedSettings({ yearId, settings });
      setIsGenerating(true);
      const { data } = await api.post("/timetables/generate", {
        classId: selectedClass,
        academicYearId: yearId,
        settings,
      });

      toast.success(data.message || "Timetable generated successfully!");
      // Fetch fresh from the DB to ensure all Mongoose populates are fully resolved
      await fetchTimetable(selectedClass);
      setIsGenerating(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed");
      setIsGenerating(false);
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
      {!isStudent && (
        <div className="print:hidden">
          <GeneratorControls
            onGenerate={handleGenerate}
            onClassChange={fetchTimetable}
            isGenerating={isGenerating}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            onSettingsChange={setCurrentSettings}
          />
        </div>
      )}
      <TimetableGrid 
        schedule={scheduleData} 
        isLoading={loadingSchedule} 
        isAdmin={isAdmin}
        classId={selectedClass}
        onPeriodUpdated={() => fetchTimetable(selectedClass)}
      />
      {isAdmin && scheduleData.length > 0 && (
        <div className="print:hidden">
          <TimetableStatistics 
            scheduleData={scheduleData} 
            onRegenerateWithWeights={handleRegenerateWithWeights} 
            isGenerating={isGenerating}
          />
        </div>
      )}
    </div>
  );
};

export default Timetable;
