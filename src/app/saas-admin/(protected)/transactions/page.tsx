"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get("/api/superadmin/transactions");
        setTransactions(data.transactions);
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const formatNGN = (kobo: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(kobo / 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Transactions</h1>
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5 text-white/50 text-xs uppercase">
            <tr>
              <th className="px-6 py-4">School</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx: any) => (
              <tr key={tx._id} className="text-sm">
                <td className="px-6 py-4 font-medium text-white">{tx.school?.name || "Unknown"}</td>
                <td className="px-6 py-4 text-white">{formatNGN(tx.amountKobo)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${tx.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/50 font-mono text-xs">{tx.reference}</td>
                <td className="px-6 py-4 text-white/50 capitalize">{tx.type?.replace("_", " ")}</td>
                <td className="px-6 py-4 text-white/50">{new Date(tx.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/50">No transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
