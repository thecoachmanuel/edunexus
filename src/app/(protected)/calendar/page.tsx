import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar & Schedule",
  description: "View and manage school events",
};

export default function CalendarPage() {
  return (
    <div className="p-8 h-[calc(100vh-4rem)]">
      <CalendarGrid />
    </div>
  );
}
