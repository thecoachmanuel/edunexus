"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Loader2, TrendingUp, Users, BookOpen, Banknote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const { data, isLoading } = useSWR(user?.role === "admin" ? "/analytics" : null);

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const enrollmentData = data?.enrollmentData || [];
  const financeData = data?.financeData || [];
  const academicData = data?.academicData || [];

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-muted-foreground mt-1">
          High-level insights into enrollment, finances, and academic performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Enrollment Pie Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" /> User Demographics
            </CardTitle>
            <CardDescription>Breakdown of active users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {enrollmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={enrollmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {enrollmentData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: any) => [value, "Users"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Academic Performance Bar Chart */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" /> Academic Performance
            </CardTitle>
            <CardDescription>Average score across all subjects based on report cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {academicData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(value: any) => [`${value}%`, "Average Score"]} />
                    <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                      {academicData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.average >= 75 ? "#10b981" : entry.average >= 50 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No report cards generated yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Finance Line Chart */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-purple-500" /> Financial Overview (Last 6 Months)
            </CardTitle>
            <CardDescription>Revenue from collected fees vs recorded expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {financeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financeData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(value: any) => [`₦${value.toLocaleString()}`, ""]} />
                    <Legend />
                    <Line type="monotone" name="Revenue (Fees)" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Expenses" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No financial data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
