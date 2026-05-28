"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FinanceOverviewCards } from "@/components/finance/FinanceOverviewCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";

export default function FinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "student" || user?.role === "parent") {
      router.replace("/finance/my-fees");
      return;
    }
    
    api.get("/finance/overview").then(res => setData(res.data)).catch(console.error);
  }, [user, router]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Finance Overview</h1>
      <FinanceOverviewCards 
        totalFeesCollected={data.totalFeesCollected}
        pendingFees={data.pendingFees}
        totalExpenses={data.totalExpenses}
        netBalance={data.netBalance}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent transactions to display.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
