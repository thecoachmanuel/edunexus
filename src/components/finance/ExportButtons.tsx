"use client";
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
    
    doc.save(`${filename}.pdf`);
  };

  const exportCSV = () => {
    const headers = columns.map(col => col.header).join(",");
    const rows = data.map(item => 
      columns.map(col => {
        let val = item[col.dataKey];
        if (typeof val === "object" && val !== null) {
            val = val.name || "";
        }
        return `"${val || ""}"`;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
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
}
