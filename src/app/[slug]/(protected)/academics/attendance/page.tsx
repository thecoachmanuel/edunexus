"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AttendancePage() {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const [date, setDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [records, setRecords] = useState<Record<string, { status: string; remarks: string }>>({});
  const [saving, setSaving] = useState(false);

  // Fetch classes via SWR
  const { data: classesData, isLoading: loadingClasses } = useSWR(
    user ? "/classes?limit=1000" : null
  );

  const allClasses = classesData?.classes || [];
  const classes = isTeacher
    ? allClasses.filter((c: any) => c.classTeacher?._id === user?._id)
    : allClasses;

  // Auto-select first class when loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // Fetch students for selected class via SWR
  const { data: studentsData, isLoading: loadingStudents } = useSWR(
    selectedClassId ? `/users?role=student&limit=1000` : null
  );
  const students = (studentsData?.users || []).filter(
    (s: any) => s.studentClass?._id === selectedClassId
  );

  // Fetch existing attendance record via SWR
  const dateString = format(date, "yyyy-MM-dd");
  const { data: attendanceData, isLoading: loadingAttendance } = useSWR(
    selectedClassId ? `/attendance?classId=${selectedClassId}&date=${dateString}` : null
  );

  // Fetch missed attendance days
  const { data: missedData, mutate: mutateMissed } = useSWR(
    selectedClassId && year?._id ? `/attendance/missed?classId=${selectedClassId}&academicYearId=${year._id}` : null
  );
  const missedDays: string[] = missedData?.missedDays || [];

  const loading = loadingStudents || loadingAttendance;

  // Sync records whenever students or attendance changes
  useEffect(() => {
    if (students.length === 0) return;
    const existingRecord = attendanceData?.attendance;
    const newRecords: Record<string, { status: string; remarks: string }> = {};
    students.forEach((student: any) => {
      if (existingRecord) {
        const existingStudent = existingRecord.records.find(
          (r: any) => r.student._id === student._id
        );
        if (existingStudent) {
          newRecords[student._id] = {
            status: existingStudent.status,
            remarks: existingStudent.remarks || "",
          };
          return;
        }
      }
      newRecords[student._id] = { status: "Present", remarks: "" };
    });
    setRecords(newRecords);
  }, [students.length, attendanceData, selectedClassId, dateString]);

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !year) {
      toast.error("Missing class or academic year");
      return;
    }

    try {
      setSaving(true);
      const payloadRecords = Object.keys(records).map((studentId) => ({
        student: studentId,
        status: records[studentId].status,
        remarks: records[studentId].remarks,
      }));

      await api.post("/attendance", {
        classId: selectedClassId,
        academicYearId: year._id,
        date: dateString,
        records: payloadRecords,
      });

      toast.success("Attendance saved successfully!");
      if (mutateMissed) mutateMissed();
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Disable weekends, future dates, and dates outside academic year
  const isDateDisabled = (d: Date) => {
    const day = d.getDay();
    if (day === 0 || day === 6) return true; // Weekend
    
    // Disable future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d > today) return true;

    // Disable dates outside academic year bounds
    if (year) {
      if (year.fromYear && d < new Date(year.fromYear)) return true;
      if (year.toYear && d > new Date(year.toYear)) return true;
    }

    return false;
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Attendance</h1>
        <p className="text-muted-foreground">
          Track and manage student attendance records.
        </p>
      </div>

      {missedDays.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-500 mb-2">
            Missed Attendance Days ({missedDays.length})
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-600 mb-3">
            You have not recorded attendance for the following days. Click a date to jump to it.
          </p>
          <div className="flex flex-wrap gap-2">
            {missedDays.slice(0, 15).map((missedDate) => (
              <Badge 
                key={missedDate}
                variant="outline" 
                className="cursor-pointer bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-500 border-amber-300 dark:border-amber-800"
                onClick={() => setDate(new Date(missedDate))}
              >
                {format(new Date(missedDate), "MMM d, yyyy")}
              </Badge>
            ))}
            {missedDays.length > 15 && (
              <Badge variant="outline" className="bg-transparent border-dashed">
                +{missedDays.length - 15} more
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-md border items-end">
        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                disabled={isDateDisabled}
                defaultMonth={date}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={loadingClasses}>
            <SelectTrigger>
              <SelectValue placeholder={loadingClasses ? "Loading..." : "Select Class"} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c: any) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Student Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[300px]">Remarks (Optional)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  {selectedClassId ? "No students found in this class." : "Please select a class."}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student: any) => (
                <TableRow key={student._id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <RadioGroup
                      value={records[student._id]?.status || "Present"}
                      onValueChange={(val) => handleStatusChange(student._id, val)}
                      className="flex flex-wrap items-center gap-4"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="Present" id={`p-${student._id}`} />
                        <Label htmlFor={`p-${student._id}`} className="text-green-600 font-medium">Present</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="Absent" id={`a-${student._id}`} />
                        <Label htmlFor={`a-${student._id}`} className="text-red-600 font-medium">Absent</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="Late" id={`l-${student._id}`} />
                        <Label htmlFor={`l-${student._id}`} className="text-amber-600 font-medium">Late</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="Excused" id={`e-${student._id}`} />
                        <Label htmlFor={`e-${student._id}`} className="text-blue-600 font-medium">Excused</Label>
                      </div>
                    </RadioGroup>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Reason for absence/lateness..."
                      value={records[student._id]?.remarks || ""}
                      onChange={(e) => handleRemarksChange(student._id, e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || students.length === 0 || !selectedClassId}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Attendance
        </Button>
      </div>
    </div>
  );
}
