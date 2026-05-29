"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, BarChart2 } from "lucide-react";
import type { schedule } from "@/types";

interface Props {
  scheduleData: schedule[];
  onRegenerateWithWeights: (weights: Record<string, number>) => void;
  isGenerating: boolean;
}

export default function TimetableStatistics({ scheduleData, onRegenerateWithWeights, isGenerating }: Props) {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({});
  const [totalAvailable, setTotalAvailable] = useState(0);

  useEffect(() => {
    if (!scheduleData || !Array.isArray(scheduleData) || scheduleData.length === 0) return;

    const newWeights: Record<string, number> = {};
    const names: Record<string, string> = {};
    let total = 0;

    scheduleData.forEach((day) => {
      day?.periods?.forEach((period) => {
        // Count non-break periods to establish total available slots
        if (period.subject || period.teacher) {
          total++;
        }

        if (period?.subject && typeof period.subject === "object" && period.subject._id) {
          const id = period.subject._id;
          newWeights[id] = (newWeights[id] || 0) + 1;
          names[id] = period.subject.name || "Unknown Subject";
        }
      });
    });

    setWeights(newWeights);
    setSubjectNames(names);
    setTotalAvailable(total);
  }, [scheduleData]);

  if (!scheduleData || scheduleData.length === 0) return null;

  const totalAssigned = Object.values(weights).reduce((a, b) => a + b, 0);
  const diff = totalAssigned - totalAvailable;

  const handleWeightChange = (id: string, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setWeights((prev) => ({ ...prev, [id]: num }));
    }
  };

  return (
    <Card className="w-full mt-6 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="h-5 w-5 text-primary" />
              Subject Distribution
            </CardTitle>
            <CardDescription>
              Adjust the desired number of periods per subject and regenerate.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Periods: </span>
              <span className={`font-bold ${diff > 0 ? "text-destructive" : diff < 0 ? "text-amber-500" : "text-emerald-600"}`}>
                {totalAssigned} / {totalAvailable}
              </span>
            </div>
            <Button
              onClick={() => onRegenerateWithWeights(weights)}
              disabled={isGenerating || diff > 0}
              size="sm"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {diff > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
            You have assigned {diff} more periods than available in the week. Please reduce some subject weights before regenerating.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(subjectNames).map(([id, name]) => (
            <div key={id} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/20">
              <span className="text-sm font-medium truncate" title={name}>{name}</span>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  className="h-8"
                  value={weights[id] || 0}
                  onChange={(e) => handleWeightChange(id, e.target.value)}
                />
                <Badge variant="secondary" className="whitespace-nowrap">
                  {((weights[id] || 0) / totalAvailable * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
