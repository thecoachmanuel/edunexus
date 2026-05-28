"use client";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SalaryDialog } from "@/components/finance/SalaryDialog";
import { PayslipView } from "@/components/finance/PayslipView";
import { ExportButtons } from "@/components/finance/ExportButtons";
import { SalaryRecord } from "@/types";

export default function SalaryPage() {
  const { data, mutate } = useSWR("/finance/salary");
  const salaries: SalaryRecord[] = data?.salaries || [];

  const loadData = () => {
    mutate();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Salary Management</h1>
        <div className="flex items-center gap-4">
          <ExportButtons 
            filename="salaries" 
            data={salaries} 
            columns={[
              { header: "Employee", dataKey: "employee" },
              { header: "Period", dataKey: "month" }, // simple mapping for export
              { header: "Net Salary", dataKey: "netSalary" },
              { header: "Status", dataKey: "status" },
            ]} 
          />
          <SalaryDialog onSave={loadData} />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Basic Salary</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payslip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaries.map(s => (
              <TableRow key={s._id}>
                <TableCell>{typeof s.employee === "object" ? s.employee.name : ""}</TableCell>
                <TableCell>{s.month}/{s.year}</TableCell>
                <TableCell>₦{s.basicSalary}</TableCell>
                <TableCell className="font-bold">₦{s.netSalary}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "paid" ? "default" : "secondary"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <PayslipView record={s} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
