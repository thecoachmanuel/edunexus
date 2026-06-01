"use client";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseDialog } from "@/components/finance/ExpenseDialog";
import { ExportButtons } from "@/components/finance/ExportButtons";
import { Expense } from "@/types";
import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, mutate } = useSWR(`/finance/expenses?search=${debouncedSearch}&category=${categoryFilter}`);
  const expenses: Expense[] = data?.expenses || [];

  const loadData = () => {
    mutate();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4 ml-auto">
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
                <TableCell>{typeof e.recordedBy === "object" && e.recordedBy ? (e.recordedBy as any).name : "Admin"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
