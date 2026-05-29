import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, User as UserIcon, CalendarDays } from "lucide-react";
import type { schedule } from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EditPeriodDialog from "./EditPeriodDialog";

interface Props {
  schedule: schedule[];
  isLoading: boolean;
  isAdmin?: boolean;
  classId?: string;
  onPeriodUpdated?: () => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableGrid = ({ schedule, isLoading, isAdmin, classId, onPeriodUpdated }: Props) => {
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [editState, setEditState] = useState({
    isOpen: false,
    day: "",
    startTime: "",
    endTime: "",
    currentSubjectId: "",
    currentTeacherId: "",
  });

  const handleCellClick = (day: string, time: string, period: any) => {
    if (!isAdmin || !classId) return;
    setEditState({
      isOpen: true,
      day,
      startTime: time,
      endTime: period?.endTime || "",
      currentSubjectId: period?.subject?._id || period?.subject || "",
      currentTeacherId: period?.teacher?._id || period?.teacher || "",
    });
  };

  const timeSlots = useMemo(() => {
    if (!schedule || !Array.isArray(schedule)) return [];
    const times = new Set<string>();
    schedule.forEach((day) => {
      day?.periods?.forEach((period) => {
        if (period?.startTime) {
          times.add(period.startTime);
        }
      });
    });
    return Array.from(times).sort();
  }, [schedule]);

  if (isLoading) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center border rounded-lg bg-card">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center border rounded-lg border-dashed bg-card">
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-lg">No Timetable Generated</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Select a class and academic year to view the schedule.
        </p>
      </div>
    );
  }


  const getRowLabel = (startTime: string) => {
    if (!Array.isArray(schedule)) return startTime;
    for (const day of schedule) {
      const found = day?.periods?.find((p) => p?.startTime === startTime);
      if (found) {
        return `${found.startTime} - ${found.endTime}`;
      }
    }
    return startTime;
  };

  return (
    <div className="w-full">
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* MOBILE VIEW */}
      <div className="block md:hidden print:hidden space-y-4">
        <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
          <TabsList className="w-full flex overflow-x-auto h-auto p-1 sticky top-14 z-10 bg-background/95 backdrop-blur">
            {DAYS.map((day) => (
              <TabsTrigger key={day} value={day} className="flex-1 min-w-[80px] text-xs">
                {day.substring(0, 3)}
              </TabsTrigger>
            ))}
          </TabsList>

          {DAYS.map((day) => {
            const dayData = schedule.find((d) => d?.day === day);
            return (
              <TabsContent key={day} value={day} className="mt-4 space-y-3 outline-none">
                {timeSlots.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No classes scheduled.</p>
                )}
                {timeSlots.map((time) => {
                  const period = dayData?.periods?.find((p) => p?.startTime === time);
                  return (
                    <div 
                      key={time} 
                      className={`flex flex-col border rounded-lg overflow-hidden bg-card shadow-sm ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
                      onClick={() => handleCellClick(day, time, period)}
                    >
                      <div className="bg-muted/50 p-2 text-xs font-semibold text-muted-foreground border-b flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {getRowLabel(time)}
                      </div>
                      <div className="p-4">
                        {period && period.subject && period.teacher ? (
                          <div className="flex flex-col gap-3 border-l-4 border-l-primary pl-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-primary">
                                  {typeof period.subject === "object" && period.subject?.name ? period.subject.name : "Subject Name Missing"}
                                </h4>
                              </div>
                              <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                {typeof period.subject === "object" && period.subject?.code ? period.subject.code : "Code"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {typeof period.teacher === "object" && period.teacher?.name ? period.teacher.name : "Teacher Missing"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-4 bg-primary/5 rounded-md border border-dashed border-primary/20">
                            <span className="text-sm font-medium text-primary/60">Free Period</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block print:block">
        <div className="w-full rounded-md border bg-card overflow-auto print:overflow-visible max-h-[70vh] print:max-h-none relative z-0 shadow-sm">
          <div className="w-max min-w-full print:w-full">
            {/* Header Row */}
            <div className="flex border-b sticky top-0 z-20 bg-background">
              <div className="w-32 shrink-0 border-r p-4 font-bold text-muted-foreground flex items-center justify-center bg-muted/80 sticky left-0 z-30 shadow-[1px_0_0_0_hsl(var(--border))]">
                Time
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 min-w-[200px] print:min-w-0 border-r p-4 print:p-2 font-bold text-center last:border-r-0 bg-muted/80 text-sm print:text-xs"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {timeSlots?.map((time) => (
              <div className="flex border-b last:border-b-0" key={time}>
                {/* Row Header (Sticky Left) */}
                <div className="w-32 print:w-20 shrink-0 border-r p-3 print:p-1 text-xs font-semibold text-muted-foreground flex items-center justify-center text-center bg-muted/40 sticky left-0 z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                  {getRowLabel(time)}
                </div>

                {/* Day Cells */}
                {DAYS.map((day) => {
                  const dayData = schedule.find((d) => d?.day === day);
                  const period = dayData?.periods?.find((p) => p?.startTime === time);

                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`flex-1 min-w-[200px] print:min-w-0 border-r p-3 print:p-1.5 last:border-r-0 hover:bg-muted/10 transition-colors ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:z-10 relative' : ''}`}
                      onClick={() => handleCellClick(day, time, period)}
                    >
                      {period && period.subject && period.teacher ? (
                        <div className="h-full min-h-[100px] w-full rounded-md border bg-background p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-2 border-l-4 border-l-primary group">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="font-bold text-[10px] px-1.5 bg-background">
                                {typeof period.subject === "object" && period.subject?.code ? period.subject.code : "Code"}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-sm leading-tight text-primary line-clamp-2 group-hover:text-primary/80 transition-colors">
                              {typeof period.subject === "object" && period.subject?.name ? period.subject.name : "Subject Name Missing"}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-dashed">
                            <UserIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate" title={typeof period.teacher === "object" && period.teacher?.name ? period.teacher.name : ""}>
                              {typeof period.teacher === "object" && period.teacher?.name ? period.teacher.name : "Teacher Missing"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[100px] w-full rounded-md border border-dashed border-primary/30 bg-primary/5 flex items-center justify-center opacity-70">
                          <span className="text-xs text-primary/60 font-medium">Free Period</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {isAdmin && classId && (
        <EditPeriodDialog
          isOpen={editState.isOpen}
          onClose={() => setEditState({ ...editState, isOpen: false })}
          classId={classId}
          day={editState.day}
          startTime={editState.startTime}
          endTime={editState.endTime}
          currentSubjectId={editState.currentSubjectId}
          currentTeacherId={editState.currentTeacherId}
          onSuccess={() => {
            if (onPeriodUpdated) onPeriodUpdated();
          }}
        />
      )}
    </div>
  );
};

export default TimetableGrid;
