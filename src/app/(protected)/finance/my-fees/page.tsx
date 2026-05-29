"use client";
import { useState } from "react";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Landmark, Send, Copy, Check } from "lucide-react";
import { StudentFee } from "@/types";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/AuthProvider";

export default function MyFees() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { data: feesData } = useSWR("/finance/student-fees");
  const { data: settingsData } = useSWR("/settings/school");

  const fees: StudentFee[] = feesData?.studentFees || [];
  const settings = settingsData?.settings;
  const hasUnpaidFees = fees.some(f => f.balance > 0);

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

  const sendWhatsAppReceipt = (fee: StudentFee) => {
    if (!settings?.whatsappNumber) return;
    
    const feeName = typeof fee.feeStructure === "object" ? fee.feeStructure.name : "Fee";
    const studentName = typeof fee.student === "object" ? fee.student.name : "my child";
    
    let message = `Hello ${settings.schoolName || 'Admin'},%0A%0A`;
    message += `I have made a payment for *${feeName}* for student *${studentName}*.%0A`;
    message += `Please find attached my payment receipt.%0A%0A`;
    message += `Thank you!`;

    const cleanNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Fees</h1>
        <p className="text-muted-foreground mt-1">
          View your fee statements and payment instructions.
        </p>
      </div>
      
      {hasUnpaidFees && settings?.bankName && (
        <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              How to Pay
            </CardTitle>
            <CardDescription className="text-blue-600/80 dark:text-blue-300/80">
              Please make a bank transfer to the school account below, then send your receipt via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground mb-1">Bank Name</p>
                <p className="font-semibold">{settings.bankName}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">Account Name</p>
                <p className="font-semibold">{settings.accountName}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">Account Number</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg tracking-wider font-mono">{settings.accountNumber}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.accountNumber || "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    title="Copy Account Number"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600 animate-in fade-in" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Type</TableHead>
              {user?.role === "parent" && <TableHead>Student</TableHead>}
              <TableHead>Due Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map(f => (
              <TableRow key={f._id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{typeof f.feeStructure === "object" ? f.feeStructure.name : ""}</TableCell>
                {user?.role === "parent" && (
                  <TableCell>{typeof f.student === "object" ? f.student.name : ""}</TableCell>
                )}
                <TableCell>{typeof f.feeStructure === "object" ? new Date(f.feeStructure.dueDate).toLocaleDateString() : ""}</TableCell>
                <TableCell>₦{f.totalAmount.toLocaleString()}</TableCell>
                <TableCell className="text-green-600">₦{f.amountPaid.toLocaleString()}</TableCell>
                <TableCell className="text-red-600 font-semibold">₦{f.balance.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={f.status === "paid" ? "default" : f.status === "partial" ? "secondary" : "destructive"} className="capitalize">
                    {f.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {f.balance > 0 && settings?.whatsappNumber && (
                      <Button 
                        size="sm" 
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white transition-colors"
                        onClick={() => sendWhatsAppReceipt(f)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Receipt
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => downloadReceipt(f)} title="Download Statement">
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {fees.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No fees assigned yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {fees.map(f => {
          const percentPaid = f.totalAmount > 0 ? Math.min(100, Math.max(0, (f.amountPaid / f.totalAmount) * 100)) : 0;
          return (
            <Card key={f._id} className="border bg-card shadow-sm hover:shadow transition-all duration-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-foreground leading-snug">
                      {typeof f.feeStructure === "object" ? f.feeStructure.name : "Fee"}
                    </h3>
                    {user?.role === "parent" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Student: <span className="font-medium text-foreground">{typeof f.student === "object" ? f.student.name : ""}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant={f.status === "paid" ? "default" : f.status === "partial" ? "secondary" : "destructive"} className="shrink-0 capitalize">
                    {f.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Payment Progress</span>
                    <span className="font-medium text-foreground">{Math.round(percentPaid)}% Paid</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${f.status === 'paid' ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                      style={{ width: `${percentPaid}%` }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs pt-2 border-t border-dashed">
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">Due Date</p>
                    <p className="font-medium text-foreground">
                      {typeof f.feeStructure === "object" ? new Date(f.feeStructure.dueDate).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">Total Amount</p>
                    <p className="font-semibold text-foreground">
                      ₦{f.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">Amount Paid</p>
                    <p className="font-semibold text-green-600">
                      ₦{f.amountPaid.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium mb-0.5">Balance Left</p>
                    <p className="font-bold text-red-600">
                      ₦{f.balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-muted">
                  {f.balance > 0 && settings?.whatsappNumber && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center gap-2 py-5 font-semibold text-xs transition-colors"
                      onClick={() => sendWhatsAppReceipt(f)}
                    >
                      <Send className="h-4 w-4" />
                      Send Receipt
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`${f.balance > 0 && settings?.whatsappNumber ? "px-3 py-5" : "w-full py-5 font-semibold text-xs"}`}
                    onClick={() => downloadReceipt(f)} 
                    title="Download Statement"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Statement
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {fees.length === 0 && (
          <div className="text-center py-10 border rounded-lg bg-card text-muted-foreground">
            No fees assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}
