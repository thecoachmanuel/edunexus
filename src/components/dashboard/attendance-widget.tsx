"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, CalendarRange } from "lucide-react";

interface AttendanceWidgetProps {
  role?: string;
}

export function AttendanceWidget({ role }: AttendanceWidgetProps) {
  const { data, isLoading } = useSWR("/dashboard/attendance-stats");

  if (isLoading) {
    return (
      <Card className="h-[350px] flex flex-col justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-4">Loading attendance...</p>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            7-Day Attendance Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          No attendance data available.
        </CardContent>
      </Card>
    );
  }

  const isStudent = role === "student";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CalendarRange className="h-5 w-5" />
          7-Day Attendance Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000' }}
              formatter={(value: any, name: any, props: any) => {
                if (isStudent) return [props.payload.status, "Status"];
                return [`${value}% (${props.payload.totalRecords} records)`, "Attendance"];
              }}
            />
            <Bar 
              dataKey={isStudent ? "score" : "percentage"} 
              fill="#3ecf8e" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
