import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks & Kanban",
  description: "Manage your tasks",
};

export default function TasksPage() {
  return (
    <div className="p-8 h-[calc(100vh-4rem)]">
      <KanbanBoard />
    </div>
  );
}
