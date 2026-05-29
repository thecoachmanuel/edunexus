"use client";
import useSWR from "swr";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FeeStructureDialog } from "@/components/finance/FeeStructureDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { ExportButtons } from "@/components/finance/ExportButtons";
import { FeeStructure, StudentFee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Loader2, Users, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { useDebounce } from "@/hooks/useDebounce";

export default function FeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: structuresData, mutate: mutateStructures, isLoading: loadingStructures } = useSWR("/finance/fee-structures");
  const { data: feesData, mutate: mutateFees, isLoading: loadingFees } = useSWR(`/finance/student-fees?search=${debouncedSearch}&status=${statusFilter}`);

  const [editStructure, setEditStructure] = useState<FeeStructure | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const structures: FeeStructure[] = structuresData?.feeStructures || [];
  const fees: StudentFee[] = feesData?.studentFees || [];

  const loadData = () => {
    mutateStructures();
    mutateFees();
  };

  const { year } = useAuth();

  const handleDeleteStructure = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;
    try {
      await api.delete(`/finance/fee-structures/${id}`);
      toast.success("Fee structure deleted");
      mutateStructures();
    } catch (error) {
      toast.error("Failed to delete fee structure");
    }
  };

  const handleAssignToClass = async (structure: FeeStructure) => {
    if (!confirm(`Assign ${structure.name} to all students in ${typeof structure.class === 'object' ? structure.class.name : 'the class'}?`)) return;
    try {
      const payload = {
        assignToClass: true,
        classId: typeof structure.class === 'object' ? structure.class._id : structure.class,
        feeStructureId: structure._id,
        totalAmount: structure.amount,
        academicYear: year?._id,
      };
      const res = await api.post("/finance/student-fees", payload);
      toast.success(`Assigned fee to ${res.data.count} students successfully`);
      mutateFees();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign fee");
    }
  };

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
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                      <Button variant="ghost" size="icon" title="Assign to Class" onClick={() => handleAssignToClass(s)}>
                        <Users className="h-4 w-4 text-blue-500" />
                      </Button>
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
