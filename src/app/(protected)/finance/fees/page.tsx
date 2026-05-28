"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FeeStructureDialog } from "@/components/finance/FeeStructureDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { ExportButtons } from "@/components/finance/ExportButtons";
import { FeeStructure, StudentFee } from "@/types";

export default function FeeManagement() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);

  const loadData = () => {
    api.get("/finance/fee-structures").then(res => setStructures(res.data.feeStructures));
    api.get("/finance/student-fees").then(res => setFees(res.data.studentFees));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
        <FeeStructureDialog onSave={loadData} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Student Fees</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <ExportButtons 
              filename="student-fees" 
              data={fees} 
              columns={[
                { header: "Student", dataKey: "student" },
                { header: "Fee Type", dataKey: "feeStructure" },
                { header: "Total", dataKey: "totalAmount" },
                { header: "Paid", dataKey: "amountPaid" },
                { header: "Balance", dataKey: "balance" },
                { header: "Status", dataKey: "status" },
              ]} 
            />
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map(f => (
                  <TableRow key={f._id}>
                    <TableCell>{typeof f.student === "object" ? f.student.name : ""}</TableCell>
                    <TableCell>{typeof f.feeStructure === "object" ? f.feeStructure.name : ""}</TableCell>
                    <TableCell>${f.totalAmount}</TableCell>
                    <TableCell>${f.amountPaid}</TableCell>
                    <TableCell>${f.balance}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "paid" ? "default" : f.status === "partial" ? "secondary" : "destructive"}>
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {f.status !== "paid" && <RecordPaymentDialog fee={f} onSave={loadData} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="structures" className="space-y-4 pt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map(s => (
                  <TableRow key={s._id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{typeof s.class === "object" ? s.class.name : ""}</TableCell>
                    <TableCell className="capitalize">{s.category}</TableCell>
                    <TableCell>${s.amount}</TableCell>
                    <TableCell>{new Date(s.dueDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
