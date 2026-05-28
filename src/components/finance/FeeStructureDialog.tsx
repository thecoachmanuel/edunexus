"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/AuthProvider";
import { Class } from "@/types";

export function FeeStructureDialog({ onSave, initialData, open: controlledOpen, onOpenChange }: { onSave: () => void, initialData?: any, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { year } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const [classes, setClasses] = useState<Class[]>([]);
  const [formData, setFormData] = useState({
    name: "", amount: "", class: "", category: "tuition", dueDate: ""
  });

  useEffect(() => {
    if (isOpen) {
      api.get("/classes?limit=1000").then(res => setClasses(res.data.classes));
      if (initialData) {
        setFormData({
          name: initialData.name || "",
          amount: initialData.amount ? String(initialData.amount) : "",
          class: typeof initialData.class === 'object' ? initialData.class._id : initialData.class || "",
          category: initialData.category || "tuition",
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : ""
        });
      } else {
        setFormData({ name: "", amount: "", class: "", category: "tuition", dueDate: "" });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class) {
      toast.error("Please select a class");
      return;
    }
    try {
      const payload = { ...formData, amount: Number(formData.amount), academicYear: year?._id };
      if (initialData && initialData._id) {
        await api.put(`/finance/fee-structures/${initialData._id}`, payload);
        toast.success("Fee structure updated");
      } else {
        await api.post("/finance/fee-structures", payload);
        toast.success("Fee structure created");
      }
      setIsOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to save fee structure");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>Add Fee Structure</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Create"} Fee Structure</DialogTitle>
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
            <Select value={formData.class || undefined} onValueChange={v => setFormData({ ...formData, class: v })}>
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
