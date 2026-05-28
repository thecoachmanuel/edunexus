"use client";
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
    
    doc.text(`Employee: ${typeof record.employee === "object" ? record.employee.name : "N/A"}`, 14, 40);
    doc.text(`Month/Year: ${record.month}/${record.year}`, 14, 50);
    
    autoTable(doc, {
      startY: 60,
      head: [["Description", "Amount"]],
      body: [
        ["Basic Salary", `₦${record.basicSalary}`],
        ["Allowances", `₦${record.allowances}`],
        ["Deductions", `₦${record.deductions}`],
        ["Net Salary", `₦${record.netSalary}`],
      ]
    });
    
    doc.save(`Payslip_${record.month}_${record.year}.pdf`);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
              <span>₦{record.basicSalary}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Allowances</span>
              <span className="text-emerald-500">+₦{record.allowances}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Deductions</span>
              <span className="text-rose-500">-₦{record.deductions}</span>
            </div>
            <div className="flex justify-between py-2 border-t font-bold text-base mt-2">
              <span>Net Salary</span>
              <span>₦{record.netSalary}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={downloadPayslip}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
