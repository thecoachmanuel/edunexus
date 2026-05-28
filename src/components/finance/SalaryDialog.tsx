"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function SalaryDialog({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basicSalary: "", allowances: "0", deductions: "0", status: "pending", paymentMethod: "bank_transfer"
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get("/users?role=teacher"),
        api.get("/users?role=admin")
      ]).then(([teachersRes, adminsRes]) => {
        const teachers = teachersRes.data.users || [];
        const admins = adminsRes.data.users || [];
        setEmployees([...teachers, ...admins]);
      }).catch(err => {
        toast.error("Failed to load employees");
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/finance/salary", { 
        ...formData, 
        basicSalary: Number(formData.basicSalary),
        allowances: Number(formData.allowances),
        deductions: Number(formData.deductions),
        academicYear: "664684a22b79a9bd12345678"
      });
      toast.success("Salary recorded");
      setOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to record salary");
    }
  };

  const netSalary = useMemo(() => {
    return Number(formData.basicSalary || 0) + Number(formData.allowances || 0) - Number(formData.deductions || 0);
  }, [formData.basicSalary, formData.allowances, formData.deductions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record Salary</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Salary</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={formData.employee} onValueChange={v => setFormData({ ...formData, employee: v })}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Input required type="number" min="1" max="12" value={formData.month} onChange={e => setFormData({ ...formData, month: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input required type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Basic Salary</Label>
            <Input required type="number" value={formData.basicSalary} onChange={e => setFormData({ ...formData, basicSalary: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Allowances</Label>
              <Input type="number" value={formData.allowances} onChange={e => setFormData({ ...formData, allowances: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Deductions</Label>
              <Input type="number" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t font-semibold">
            <Label>Net Salary: ₦{netSalary}</Label>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
