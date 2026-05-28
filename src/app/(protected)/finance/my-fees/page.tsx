"use client";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { StudentFee } from "@/types";
import jsPDF from "jspdf";

export default function MyFees() {
  const { data } = useSWR("/finance/student-fees");
  const fees: StudentFee[] = data?.studentFees || [];

  const downloadReceipt = (fee: StudentFee) => {
    const doc = new jsPDF();
    doc.text("Fee Receipt", 105, 20, { align: "center" });
    doc.text(`Student: ${typeof fee.student === "object" ? fee.student.name : ""}`, 14, 40);
    doc.text(`Fee Type: ${typeof fee.feeStructure === "object" ? fee.feeStructure.name : ""}`, 14, 50);
    doc.text(`Total Amount: ₦${fee.totalAmount}`, 14, 60);
    doc.text(`Amount Paid: ₦${fee.amountPaid}`, 14, 70);
    doc.text(`Balance: ₦${fee.balance}`, 14, 80);
    doc.text(`Status: ${fee.status.toUpperCase()}`, 14, 90);
    doc.save(`Receipt_${fee._id}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Fees</h1>
      
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map(f => (
              <TableRow key={f._id}>
                <TableCell>{typeof f.feeStructure === "object" ? f.feeStructure.name : ""}</TableCell>
                <TableCell>{typeof f.feeStructure === "object" ? new Date(f.feeStructure.dueDate).toLocaleDateString() : ""}</TableCell>
                <TableCell>₦{f.totalAmount}</TableCell>
                <TableCell>₦{f.amountPaid}</TableCell>
                <TableCell>₦{f.balance}</TableCell>
                <TableCell>
                  <Badge variant={f.status === "paid" ? "default" : f.status === "partial" ? "secondary" : "destructive"}>
                    {f.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => downloadReceipt(f)}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {fees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">No fees found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
