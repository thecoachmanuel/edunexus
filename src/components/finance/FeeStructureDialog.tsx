"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Class } from "@/types";

export function FeeStructureDialog({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [formData, setFormData] = useState({
    name: "", amount: "", class: "", category: "tuition", dueDate: ""
  });

  useEffect(() => {
    if (open) {
      api.get("/classes?limit=1000").then(res => setClasses(res.data.classes));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/finance/fee-structures", { ...formData, amount: Number(formData.amount), academicYear: "664684a22b79a9bd12345678" }); // Replace with actual current year logic if available
      toast.success("Fee structure created");
      setOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to create fee structure");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Fee Structure</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fee Structure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Term 1 Tuition" />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input required type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={formData.class} onValueChange={v => setFormData({ ...formData, class: v })}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="library">Library</SelectItem>
                <SelectItem value="sport">Sport</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input required type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
