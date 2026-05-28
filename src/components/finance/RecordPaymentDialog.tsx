"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { StudentFee } from "@/types";

export function RecordPaymentDialog({ fee, onSave }: { fee: StudentFee, onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: fee.balance.toString(), method: "cash", notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/finance/student-fees/${fee._id}`, { 
        transaction: {
          amount: Number(formData.amount),
          method: formData.method,
          notes: formData.notes
        }
      });
      toast.success("Payment recorded");
      setOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Record Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment for {typeof fee.student === "object" ? fee.student.name : "Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (Max: ${fee.balance})</Label>
            <Input required type="number" max={fee.balance} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={formData.method} onValueChange={v => setFormData({ ...formData, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit">Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
