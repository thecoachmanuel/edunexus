const fs = require('fs');
const path = require('path');

const components = {
  'src/components/finance/ExportButtons.tsx': `"use client";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportButtonsProps {
  data: any[];
  columns: { header: string; dataKey: string }[];
  filename: string;
}

export function ExportButtons({ data, columns, filename }: ExportButtonsProps) {
  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.text(filename, 14, 15);
    
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: data.map(item => columns.map(col => {
        const val = item[col.dataKey];
        if (typeof val === "object" && val !== null) {
            return val.name || JSON.stringify(val);
        }
        return val || "";
      })),
      startY: 20,
    });
    
    doc.save(\`\${filename}.pdf\`);
  };

  const exportCSV = () => {
    const headers = columns.map(col => col.header).join(",");
    const rows = data.map(item => 
      columns.map(col => {
        let val = item[col.dataKey];
        if (typeof val === "object" && val !== null) {
            val = val.name || "";
        }
        return \`"\${val || ""}"\`;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", \`\${filename}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportCSV}>
        <FileText className="mr-2 h-4 w-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportPDF}>
        <FileDown className="mr-2 h-4 w-4" /> PDF
      </Button>
    </div>
  );
}`,

  'src/components/finance/FinanceOverviewCards.tsx': `"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface FinanceOverviewCardsProps {
  totalFeesCollected: number;
  pendingFees: number;
  totalExpenses: number;
  netBalance: number;
}

export function FinanceOverviewCards({ totalFeesCollected, pendingFees, totalExpenses, netBalance }: FinanceOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$\${totalFeesCollected.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$\${totalExpenses.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$\${netBalance.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
          <Activity className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$\${pendingFees.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}`,

  'src/components/finance/FeeStructureDialog.tsx': `"use client";
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
      api.get("/classes").then(res => setClasses(res.data.classes));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/finance/fee-structures", { ...formData, amount: Number(formData.amount), academicYear: "currentYearIdPlaceholder" }); // Need to handle academic year properly in actual implementation
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
}`,

  'src/components/finance/RecordPaymentDialog.tsx': `"use client";
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
      await api.put(\`/finance/student-fees/\${fee._id}\`, { 
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
            <Label>Amount (Max: \${fee.balance})</Label>
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
}`,

  'src/components/finance/ExpenseDialog.tsx': `"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ExpenseDialog({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "", amount: "", category: "supplies", date: new Date().toISOString().split('T')[0], paymentMethod: "cash"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/finance/expenses", { ...formData, amount: Number(formData.amount), academicYear: "currentYearIdPlaceholder" });
      toast.success("Expense recorded");
      setOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to record expense");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input required type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}`,

  'src/components/finance/SalaryDialog.tsx': `"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
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
      api.get("/users?role=teacher").then(res => setEmployees(res.data.users || [])); // Fetch teachers and admins
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
        academicYear: "currentYearIdPlaceholder"
      });
      toast.success("Salary recorded");
      setOpen(false);
      onSave();
    } catch (error) {
      toast.error("Failed to record salary");
    }
  };

  const netSalary = Number(formData.basicSalary) + Number(formData.allowances) - Number(formData.deductions);

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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
            <Label>Net Salary: ${netSalary}</Label>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}`,

  'src/components/finance/PayslipView.tsx': `"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalaryRecord } from "@/types";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function PayslipView({ record }: { record: SalaryRecord }) {
  const downloadPayslip = () => {
    const doc = new jsPDF();
    doc.text("Payslip", 105, 20, { align: "center" });
    
    doc.text(\`Employee: \${typeof record.employee === "object" ? record.employee.name : "N/A"}\`, 14, 40);
    doc.text(\`Month/Year: \${record.month}/\${record.year}\`, 14, 50);
    
    autoTable(doc, {
      startY: 60,
      head: [["Description", "Amount"]],
      body: [
        ["Basic Salary", \`$\${record.basicSalary}\`],
        ["Allowances", \`$\${record.allowances}\`],
        ["Deductions", \`$\${record.deductions}\`],
        ["Net Salary", \`$\${record.netSalary}\`],
      ]
    });
    
    doc.save(\`Payslip_\${record.month}_\${record.year}.pdf\`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><FileText className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payslip Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-semibold">Employee:</div>
            <div>{typeof record.employee === "object" ? record.employee.name : "N/A"}</div>
            <div className="font-semibold">Period:</div>
            <div>{record.month}/{record.year}</div>
            <div className="font-semibold">Status:</div>
            <div className="capitalize">{record.status}</div>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between py-1">
              <span>Basic Salary</span>
              <span>$\${record.basicSalary}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Allowances</span>
              <span className="text-emerald-500">+$\${record.allowances}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Deductions</span>
              <span className="text-rose-500">-$\${record.deductions}</span>
            </div>
            <div className="flex justify-between py-2 border-t font-bold text-base mt-2">
              <span>Net Salary</span>
              <span>$\${record.netSalary}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={downloadPayslip}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}`
};

Object.keys(components).forEach(filepath => {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, components[filepath]);
  console.log(`Created ${filepath}`);
});
