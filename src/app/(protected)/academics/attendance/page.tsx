"use client";

import { useEffect, useState } from "react";
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

export default function AttendancePage() {
  const { user, year } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const [date, setDate] = useState<Date>(new Date());
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, { status: string; remarks: string }>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize — wait until user object is resolved
  useEffect(() => {
    if (!user) return; // Auth not ready yet
    const init = async () => {
      try {
        const { data } = await api.get("/classes?limit=1000");
        let availableClasses = data.classes || [];
        
        if (isTeacher) {
          availableClasses = availableClasses.filter((c: any) => c.classTeacher?._id === user?._id);
        }
        
        setClasses(availableClasses);
        
        if (availableClasses.length > 0) {
          setSelectedClassId(availableClasses[0]._id);
        }
      } catch (error) {
        toast.error("Failed to load classes");
      }
    };
    if (isAdmin || isTeacher) {
      init();
    }
  }, [user]); // re-run when user resolves

  // Fetch Attendance & Students
  useEffect(() => {
    if (!user) return; // Auth not ready yet — prevent 401 on mount
    const fetchAttendanceData = async () => {
      if (!selectedClassId || !date) return;
      
      setLoading(true);
      try {
        const dateString = format(date, "yyyy-MM-dd");
        
        // 1. Fetch Students for the class
        const studentsRes = await api.get(`/users?role=student&limit=1000`);
        const classStudents = studentsRes.data.users.filter((s: any) => s.studentClass?._id === selectedClassId);
        setStudents(classStudents);

        // 2. Fetch existing attendance
        const attendanceRes = await api.get(`/attendance?classId=${selectedClassId}&date=${dateString}`);
        const existingRecord = attendanceRes.data.attendance;

        const newRecords: Record<string, { status: string; remarks: string }> = {};
        
        classStudents.forEach((student: any) => {
          if (existingRecord) {
            const existingStudent = existingRecord.records.find((r: any) => r.student._id === student._id);
            if (existingStudent) {
              newRecords[student._id] = { status: existingStudent.status, remarks: existingStudent.remarks || "" };
              return;
            }
          }
          newRecords[student._id] = { status: "Present", remarks: "" };
        });

        setRecords(newRecords);
      } catch (error) {
        toast.error("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedClassId, date, user]);

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
      const dateString = format(date, "yyyy-MM-dd");
      
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
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Disable weekends
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Attendance</h1>
        <p className="text-muted-foreground">
          Track and manage student attendance records.
        </p>
      </div>

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
                disabled={isWeekend}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Class</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
              students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <RadioGroup
                      value={records[student._id]?.status || "Present"}
                      onValueChange={(val) => handleStatusChange(student._id, val)}
                      className="flex items-center space-x-4"
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
