"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle, Sparkles, RefreshCcw } from "lucide-react";

interface InvolvedClass {
  classId: string;
  className: string;
  subjectName: string;
}

interface Clash {
  id: string;
  type: string;
  teacherId: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  involvedClasses: InvolvedClass[];
}

interface Props {
  yearId: string;
  term: string;
}

export default function TimetableAuditor({ yearId, term }: Props) {
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [scannedClasses, setScannedClasses] = useState(0);
  const [isAuditing, setIsAuditing] = useState(false);
  const [fixingClashId, setFixingClashId] = useState<string | null>(null);

  const runAudit = async () => {
    if (!yearId || !term) return;
    setIsAuditing(true);
    try {
      const { data } = await api.get(`/timetables/audit?academicYearId=${yearId}&term=${term}`);
      setClashes(data.clashes || []);
      setScannedClasses(data.scannedClasses || 0);
    } catch (error) {
      toast.error("Failed to run timetable audit");
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    runAudit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId, term]);

  const handleFix = async (clash: Clash) => {
    // Pick the first class involved to undergo a surgical swap
    const targetClass = clash.involvedClasses[0];
    if (!targetClass) return;

    setFixingClashId(clash.id);
    try {
      await api.post("/timetables/fix", {
        classId: targetClass.classId,
        academicYearId: yearId,
        term,
        day: clash.day,
        startTime: clash.startTime,
        endTime: clash.endTime,
        clashingTeacherId: clash.teacherId,
      });
      toast.success(`Successfully resolved clash for ${clash.teacherName}!`);
      // Re-run audit to verify
      await runAudit();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fix clash");
    } finally {
      setFixingClashId(null);
    }
  };

  if (!yearId || !term) {
    return (
      <Card className="w-full">
        <CardContent className="py-10 text-center text-muted-foreground">
          Please select an Academic Year and Term in the controls above.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Timetable Auditor
          </CardTitle>
          <CardDescription>
            Scanning {scannedClasses} timetables for mathematical conflicts across all classes.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={runAudit} disabled={isAuditing || fixingClashId !== null}>
          {isAuditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Re-Scan
        </Button>
      </CardHeader>

      <CardContent className="pt-4">
        {isAuditing && clashes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/50" />
            <p>Auditing mathematical constraints...</p>
          </div>
        ) : clashes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-primary/5 border-primary/20">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">100% Clash-Free</h3>
            <p className="text-sm text-muted-foreground max-w-md text-center mt-2">
              The AI auditor found zero teacher overlaps or scheduling conflicts. Your school's timetable is perfectly structured!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive font-semibold bg-destructive/10 p-3 rounded-md">
              <AlertTriangle className="h-5 w-5" />
              Detected {clashes.length} Scheduling Conflict{clashes.length === 1 ? "" : "s"}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clashes.map((clash) => (
                <Card key={clash.id} className="border-destructive/30 shadow-sm overflow-hidden">
                  <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 text-sm font-semibold flex justify-between items-center text-destructive">
                    <span>{clash.day} • {clash.startTime} - {clash.endTime}</span>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Double-booked Teacher:</p>
                      <p className="font-semibold flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                        {clash.teacherName}
                      </p>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Involved Classes:</p>
                      {clash.involvedClasses.map((ic, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="font-medium">{ic.className}</span>
                          <span className="text-xs bg-background border px-2 py-0.5 rounded">{ic.subjectName}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-3 border-t">
                    <Button 
                      className="w-full" 
                      onClick={() => handleFix(clash)} 
                      disabled={fixingClashId !== null}
                    >
                      {fixingClashId === clash.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Performing Surgical Swap...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Auto-Fix with AI</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
