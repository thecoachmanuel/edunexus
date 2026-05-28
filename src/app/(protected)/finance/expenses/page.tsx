"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseDialog } from "@/components/finance/ExpenseDialog";
import { ExportButtons } from "@/components/finance/ExportButtons";
import { Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadData = () => {
    api.get("/finance/expenses").then(res => setExpenses(res.data.expenses));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <div className="flex items-center gap-4">
          <ExportButtons 
            filename="expenses" 
            data={expenses} 
            columns={[
              { header: "Date", dataKey: "date" },
              { header: "Title", dataKey: "title" },
              { header: "Category", dataKey: "category" },
              { header: "Amount", dataKey: "amount" },
              { header: "Recorded By", dataKey: "recordedBy" },
            ]} 
          />
          <ExpenseDialog onSave={loadData} />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map(e => (
              <TableRow key={e._id}>
                <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                <TableCell>{e.title}</TableCell>
                <TableCell className="capitalize">{e.category}</TableCell>
                <TableCell>₦{e.amount}</TableCell>
                <TableCell>{typeof e.recordedBy === "object" ? e.recordedBy.name : "Admin"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
