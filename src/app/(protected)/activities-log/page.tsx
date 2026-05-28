"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ActivityTable, type Activity } from "@/components/activities/ActivityTable";
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ActivitiesLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/activities?page=${page}&limit=15`);
      setLogs(data.logs);
      setTotalPages(data.pages);
    } catch (error) {
      toast.error("Failed to load activities log");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchLogs();
    }
  }, [page, user]);

  if (authLoading || user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activities Log</h1>
        <p className="text-muted-foreground">
          View all system-wide actions and events.
        </p>
      </div>

      <ActivityTable
        data={logs}
        loading={loading}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
      />
    </div>
  );
}
