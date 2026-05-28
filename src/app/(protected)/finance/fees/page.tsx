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
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function FeeManagement() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [editStructure, setEditStructure] = useState<FeeStructure | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadData = () => {
    api.get("/finance/fee-structures").then(res => setStructures(res.data.feeStructures));
    api.get("/finance/student-fees").then(res => setFees(res.data.studentFees));
  };

  const handleDeleteStructure = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      await api.delete(`/finance/fee-structures/${id}`);
      toast.success("Fee structure deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete fee structure");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
        <FeeStructureDialog onSave={loadData} />
      </div>

      <FeeStructureDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        initialData={editStructure} 
        onSave={() => {
          setIsEditDialogOpen(false);
          setEditStructure(null);
          loadData();
        }} 
      />

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
          <div className="border rounded-lg overflow-x-auto">
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
                    <TableCell>₦{f.totalAmount}</TableCell>
                    <TableCell>₦{f.amountPaid}</TableCell>
                    <TableCell>₦{f.balance}</TableCell>
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
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map(s => (
                  <TableRow key={s._id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{typeof s.class === "object" ? s.class.name : ""}</TableCell>
                    <TableCell className="capitalize">{s.category}</TableCell>
                    <TableCell>₦{s.amount}</TableCell>
                    <TableCell>{new Date(s.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditStructure(s);
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteStructure(s._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
