"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { academicYear, Class } from "@/types";
import { useAuth } from "@/hooks/AuthProvider";

export interface BreakSetting {
  name: string;
  startTime: string;
  duration: number;
}

export interface GenSettings {
  startTime: string;
  endTime: string;
  periods: number;
  periodDuration: number;
  breaks: BreakSetting[];
  term: string;
  subjectWeights?: Record<string, number>;
}

interface Props {
  onGenerate: (
    classId: string,
    yearId: string,
    settings: GenSettings
  ) => Promise<void>;
  onClassChange: (classId: string) => void;
  isGenerating: boolean;
  selectedClass: string;
  setSelectedClass: (classId: string) => void;
  onSettingsChange?: (data: { yearId: string; settings: GenSettings }) => void;
  onBulkGenerate?: (yearId: string, settings: GenSettings) => Promise<void>;
  isBulkGenerating?: boolean;
}
const GeneratorControls = ({
  onGenerate,
  onClassChange,
  isGenerating,
  selectedClass,
  setSelectedClass,
  onSettingsChange,
  onBulkGenerate,
  isBulkGenerating,
}: Props) => {
  const { user } = useAuth();
  const hideGenerate = user?.role !== "admin";
  const [classes, setClasses] = useState<Class[]>([]);
  const [years, setYears] = useState<academicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [loadingData, setLoadingData] = useState(false);
  // Time Settings
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("14:00");
  const [periods, setPeriods] = useState("5");
  const [periodDuration, setPeriodDuration] = useState("45");
  const [breaks, setBreaks] = useState<BreakSetting[]>([]);

  useEffect(() => {
    if (!user) return; // Wait for auth to resolve
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [clsRes, yearRes] = await Promise.all([
          api.get("/classes?limit=1000"),
          api.get("/academic-years?limit=100"),
        ]);
        setClasses(clsRes.data.classes || []);

        // API returns { years: [...], pagination: {...} } — not a plain array
        const yearsList: academicYear[] = yearRes.data.years || [];
        setYears(yearsList);

        // Auto-select the current academic year and term
        const currentYear = yearsList.find((y) => y.isCurrent);
        if (currentYear?._id) {
          setSelectedYear(currentYear._id);
          if ((currentYear as any).activeTerm) {
            setSelectedTerm((currentYear as any).activeTerm);
          }
        } else if (yearsList.length > 0) {
          setSelectedYear(yearsList[0]._id);
        }
      } catch (error) {
        toast.error("Failed to load selection data");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user]); // re-run when auth resolves

  useEffect(() => {
    if (onSettingsChange && selectedYear) {
      onSettingsChange({
        yearId: selectedYear,
        settings: {
          startTime,
          endTime,
          periods: parseInt(periods, 10) || 5,
          periodDuration: parseInt(periodDuration, 10) || 45,
          breaks,
          term: selectedTerm,
        },
      });
    }
  }, [selectedYear, selectedTerm, startTime, endTime, periods, periodDuration, breaks]);


  const addBreak = () => {
    setBreaks((prev) => [...prev, { name: "Break", startTime: "10:00", duration: 15 }]);
  };

  const removeBreak = (index: number) => {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: keyof BreakSetting, value: string | number) => {
    setBreaks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const handleGenerateClick = () => {
    if (!selectedClass || !selectedYear || !selectedTerm) {
      toast.error("Please select a Class, Academic Year and Term");
      return;
    }
    onGenerate(selectedClass, selectedYear, {
      startTime,
      endTime,
      periods: parseInt(periods, 10) || 5,
      periodDuration: parseInt(periodDuration, 10) || 45,
      breaks,
      term: selectedTerm,
    });
  };

  const handleClassSelect = (val: string) => {
    setSelectedClass(val);
    onClassChange(val);
  };

  const handleBulkGenerateClick = () => {
    if (!selectedYear || !selectedTerm) {
      toast.error("Please select an Academic Year and Term");
      return;
    }
    if (onBulkGenerate) {
      onBulkGenerate(selectedYear, {
        startTime,
        endTime,
        periods: parseInt(periods, 10) || 5,
        periodDuration: parseInt(periodDuration, 10) || 45,
        breaks,
        term: selectedTerm,
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>
              {hideGenerate ? "View Timetable" : "Timetable Controls"}
            </CardTitle>
            <CardDescription>
              {hideGenerate
                ? "Select a class to view its schedule"
                : "Configure constraints and generate schedule"}
            </CardDescription>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y._id} value={y._id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={loadingData}>
              <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={selectedClass}
              onValueChange={handleClassSelect}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!hideGenerate && (
          <>
            {/* Row 1: Time range and counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>Periods / Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label>Period Duration (mins)</Label>
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Row 2: Breaks */}
            <div className="border-t pt-4 mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Break Times</Label>
                  <p className="text-xs text-muted-foreground">Add one or more breaks with custom start time and duration.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBreak}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Break
                </Button>
              </div>

              {breaks.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No breaks added. The AI will use default spacing.
                </p>
              )}

              {breaks.map((br, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end p-3 border rounded-lg bg-muted/30"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={br.name}
                      onChange={(e) => updateBreak(idx, "name", e.target.value)}
                      placeholder="e.g. Short Break"
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start Time</Label>
                    <Input
                      type="time"
                      value={br.startTime}
                      onChange={(e) => updateBreak(idx, "startTime", e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration (mins)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={br.duration}
                      onChange={(e) => updateBreak(idx, "duration", parseInt(e.target.value, 10) || 15)}
                      disabled={isGenerating}
                      className="w-24"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBreak(idx)}
                    disabled={isGenerating}
                    className="text-destructive hover:text-destructive mb-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={handleGenerateClick}
                  disabled={isGenerating || isBulkGenerating || !selectedClass || !selectedYear}
                >
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Single Class</>
                  )}
                </Button>
                {onBulkGenerate && (
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleBulkGenerateClick}
                    disabled={isGenerating || isBulkGenerating || !selectedYear}
                  >
                    {isBulkGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bulk Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4 text-amber-200" /> Bulk Generate All</>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
};

export default GeneratorControls;
