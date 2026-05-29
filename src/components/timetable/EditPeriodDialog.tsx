"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface EditPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  day: string;
  startTime: string;
  endTime: string;
  currentSubjectId?: string;
  currentTeacherId?: string;
  onSuccess: () => void;
}

export default function EditPeriodDialog({
  isOpen,
  onClose,
  classId,
  day,
  startTime,
  endTime,
  currentSubjectId,
  currentTeacherId,
  onSuccess,
}: EditPeriodDialogProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // For clash warnings
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubject(currentSubjectId || "");
      setSelectedTeacher(currentTeacherId || "");
      setClashWarning(null);
      fetchData();
    }
  }, [isOpen, currentSubjectId, currentTeacherId]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [subRes, tRes] = await Promise.all([
        api.get("/subjects?limit=1000"),
        api.get("/users?role=teacher&limit=1000"),
      ]);
      setSubjects(subRes.data.subjects || []);
      setTeachers(tRes.data.users || []);
    } catch (error) {
      toast.error("Failed to load subjects or teachers");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async (force = false) => {
    setIsSaving(true);
    setClashWarning(null);
    try {
      await api.patch(`/timetables/${classId}/period`, {
        day,
        startTime,
        subjectId: selectedSubject || null,
        teacherId: selectedTeacher || null,
        force,
      });
      toast.success("Period updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409 && error.response.data.isClash) {
        setClashWarning(error.response.data.message);
      } else {
        toast.error(error.response?.data?.message || "Failed to update period");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Period</DialogTitle>
          <DialogDescription>
            {day} • {startTime} - {endTime}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">-- Break / Free Period --</SelectItem>
                  {subjects.map((sub) => (
                    <SelectItem key={sub._id} value={sub._id}>
                      {sub.name} ({sub.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher">Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">-- No Teacher --</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {clashWarning && (
              <div className="mt-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2">
                  <p>{clashWarning}</p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-max"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Proceed Anyway
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving || loadingData || !!clashWarning}>
            {isSaving && !clashWarning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
