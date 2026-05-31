"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Bot, Ticket, ArrowUpRight } from "lucide-react";

interface AdminTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  lastActivityAt: string;
  school: { name: string; slug: string };
}

export default function SupportQueue() {
  const router = useRouter();
  const [allTickets, setAllTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ticketsRes = await axios.get("/api/superadmin/tickets");
        setAllTickets(ticketsRes.data.tickets);
      } catch (err: any) {
        if (err.response?.status === 401) router.push("/saas-admin/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const ticketStatusBadge = (status: string) => {
    if (status === "escalated")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium whitespace-nowrap">Escalated</span>;
    if (status === "ai_handling")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium whitespace-nowrap">AI Agent</span>;
    if (status === "open")
      return <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-medium whitespace-nowrap">Open</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium whitespace-nowrap capitalize">{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading Support Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {allTickets.filter((t) => t.status === "escalated").length} Escalated
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20 flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5" />
          {allTickets.filter((t) => t.status === "ai_handling").length} AI Handling
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-bold border border-white/10 flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5" />
          {allTickets.length} Total
        </span>
      </div>

      <div className="sm:hidden space-y-3">
        {allTickets.map((ticket) => (
          <div key={ticket._id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm leading-snug">{ticket.subject}</div>
                <div className="text-white/40 text-xs mt-0.5">{ticket.school?.name || "Unknown"}</div>
              </div>
              {ticketStatusBadge(ticket.status)}
            </div>
            <div className="flex items-center justify-between text-xs text-white/30">
              <span className="font-mono">{ticket.ticketNumber}</span>
              <span>{new Date(ticket.lastActivityAt).toLocaleDateString()}</span>
            </div>
            <Link
              href={`/saas-admin/tickets/${ticket._id}`}
              className="flex items-center justify-center gap-1 w-full text-xs text-violet-400 border border-violet-500/20 rounded-lg py-2 hover:bg-violet-500/5 transition-all"
            >
              View Thread <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
        {allTickets.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">No tickets found.</div>
        )}
      </div>

      <div className="hidden sm:block rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {["Ticket", "School", "Subject", "Status", "Last Activity", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {allTickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-white/60 whitespace-nowrap">
                    {ticket.ticketNumber}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold">
                    {ticket.school?.name || "Unknown"}
                    <div className="text-white/30 text-xs mt-0.5 font-normal">
                      /{ticket.school?.slug || "?"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm max-w-[200px]">
                    <div className="truncate">{ticket.subject}</div>
                    <div className="text-white/40 text-xs mt-0.5">{ticket.category}</div>
                  </td>
                  <td className="px-5 py-4">{ticketStatusBadge(ticket.status)}</td>
                  <td className="px-5 py-4 text-xs text-white/40 whitespace-nowrap">
                    {new Date(ticket.lastActivityAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/saas-admin/tickets/${ticket._id}`}
                      className="text-xs text-violet-400 hover:underline whitespace-nowrap"
                    >
                      View Thread →
                    </Link>
                  </td>
                </tr>
              ))}
              {allTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-10 text-white/30">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
