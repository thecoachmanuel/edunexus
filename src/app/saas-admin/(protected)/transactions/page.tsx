"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Search, ChevronLeft, ChevronRight, TrendingUp, DollarSign,
  CheckCircle, XCircle, Clock, Filter,
} from "lucide-react";

function formatNGN(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    success: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
    failed: { cls: "bg-red-500/15 text-red-400 border-red-500/20", icon: XCircle },
    pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: Clock },
    abandoned: { cls: "bg-white/10 text-white/40 border-white/10", icon: XCircle },
  };
  const s = map[status] || map.abandoned;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${s.cls}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

const TYPE_LABELS: Record<string, string> = {
  new_subscription: "New Sub",
  renewal: "Renewal",
  manual_payment: "Manual",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [summary, setSummary] = useState({ totalRevenue: 0, successCount: 0, failedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchData(); }, [page, debouncedSearch, statusFilter, typeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const { data } = await axios.get(`/api/superadmin/transactions?${params}`);
      setTransactions(data.transactions);
      setPagination(data.pagination);
      setSummary(data.summary || { totalRevenue: 0, successCount: 0, failedCount: 0 });
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <DollarSign className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-black">{formatNGN(summary.totalRevenue)}</div>
          <div className="text-xs text-white/40 mt-1">Total Revenue (Successful)</div>
        </div>
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-black text-emerald-400">{summary.successCount}</div>
          <div className="text-xs text-white/40 mt-1">Successful Payments</div>
        </div>
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <XCircle className="w-5 h-5 text-red-400 mb-2" />
          <div className="text-2xl font-black text-red-400">{summary.failedCount}</div>
          <div className="text-xs text-white/40 mt-1">Failed / Abandoned</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school, reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-white text-sm focus:outline-none focus:border-violet-500/50"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-white text-sm focus:outline-none focus:border-violet-500/50"
        >
          <option value="all">All Types</option>
          <option value="new_subscription">New Subscription</option>
          <option value="renewal">Renewal</option>
          <option value="manual_payment">Manual Payment</option>
        </select>
        <div className="flex items-center text-white/40 text-sm whitespace-nowrap px-1">
          {pagination.total} records
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
              <tr>
                {["School", "Amount", "Status", "Type", "Reference", "Plan", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3.5 whitespace-nowrap font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-white/5 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/30">
                    No transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/saas-admin/schools/${tx.school?._id}`} className="font-semibold text-sm hover:text-violet-400 transition-colors">
                        {tx.school?.name || "—"}
                      </Link>
                      <div className="text-white/30 text-xs font-mono mt-0.5">/{tx.school?.slug}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">{formatNGN(tx.amountKobo)}</td>
                    <td className="px-5 py-4"><StatusBadge status={tx.status} /></td>
                    <td className="px-5 py-4 text-white/50 text-sm capitalize whitespace-nowrap">
                      {TYPE_LABELS[tx.type] || tx.type}
                    </td>
                    <td className="px-5 py-4 text-white/40 font-mono text-xs whitespace-nowrap max-w-[160px] truncate">
                      {tx.reference}
                    </td>
                    <td className="px-5 py-4 text-white/50 text-sm whitespace-nowrap">
                      {tx.subscription?.plan?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-white/40 text-sm whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/30">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-white/60">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
