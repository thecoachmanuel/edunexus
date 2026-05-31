"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, User, Bot, Shield, Clock,
  CheckCircle2, AlertTriangle, Building2, Loader2, Sparkles
} from "lucide-react";

export default function TicketDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`/api/superadmin/tickets/${params.id}`);
      setTicket(res.data.ticket);
    } catch (err: any) {
      if (err.response?.status === 401) router.push("/saas-admin/login");
      if (err.response?.status === 404) router.push("/saas-admin/support");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      const res = await axios.post(`/api/superadmin/tickets/${params.id}/assign`);
      setTicket(res.data.ticket);
    } catch (err) {
      alert("Failed to assign ticket");
    }
  };

  const handleChangeStatus = async (status: string) => {
    try {
      const res = await axios.put(`/api/superadmin/tickets/${params.id}`, { status });
      setTicket(res.data.ticket);
    } catch (err) {
      alert("Failed to change status");
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/superadmin/tickets/${params.id}/reply`, {
        content: replyText,
      });
      setTicket(res.data.ticket);
      setReplyText("");
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10 shrink-0">
        <div>
          <Link href="/saas-admin/support" className="text-white/40 hover:text-white flex items-center gap-2 text-sm mb-2 w-max">
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{ticket.subject}</h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-white/40">{ticket.ticketNumber}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {ticket.school?.name} (/{ticket.school?.slug})</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <button onClick={() => handleChangeStatus("resolved")} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-sm transition-colors flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Mark Resolved
            </button>
          )}
          {!ticket.assignedTo && (
            <button onClick={handleAssignToMe} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors">
              Assign to me
            </button>
          )}
          <select 
            value={ticket.status} 
            onChange={(e) => handleChangeStatus(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="open">Status: Open</option>
            <option value="ai_handling">Status: AI Handling</option>
            <option value="escalated">Status: Escalated</option>
            <option value="resolved">Status: Resolved</option>
            <option value="closed">Status: Closed</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          {/* AI Summary Banner */}
          {ticket.aiSummary && (
            <div className="bg-blue-500/10 border-b border-blue-500/20 p-4 flex gap-3 shrink-0">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-300 mb-1">AI Context Summary</h4>
                <p className="text-sm text-blue-100/70">{ticket.aiSummary}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {ticket.messages.map((msg: any, i: number) => {
              const isSchool = msg.sender === "school";
              const isAI = msg.sender === "ai";
              const isHuman = msg.sender === "human_agent";
              const isSystem = msg.sender === "system";

              if (isSystem) {
                return (
                  <div key={i} className="flex justify-center">
                    <div className="bg-white/5 text-white/40 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex gap-3 max-w-[85%] ${isSchool ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                    isSchool ? "bg-white/10" : isAI ? "bg-blue-500/20" : "bg-violet-600"
                  }`}>
                    {isSchool ? <User className="w-4 h-4 text-white/60" /> : 
                     isAI ? <Bot className="w-4 h-4 text-blue-400" /> : 
                     <Shield className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`space-y-1 ${isSchool ? "items-start" : "items-end flex flex-col"}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-white/60">{msg.senderName} {isAI && "(AI Agent)"}</span>
                      <span className="text-[10px] text-white/30">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      isSchool ? "bg-white/5 rounded-tl-sm text-white/80" : 
                      isAI ? "bg-blue-500/10 border border-blue-500/20 rounded-tr-sm text-blue-100/90" : 
                      "bg-violet-600 rounded-tr-sm text-white"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          <form onSubmit={handleReply} className="p-4 bg-white/5 border-t border-white/5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply to the school..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 resize-none min-h-[60px] max-h-32"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="w-12 h-12 shrink-0 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] text-white/30">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </form>
        </div>

        {/* Sidebar Info (Desktop only) */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm">Ticket Details</h3>
            
            <div>
              <div className="text-xs text-white/40 mb-1">Status</div>
              <div className="text-sm font-medium capitalize">{ticket.status.replace("_", " ")}</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-1">Category</div>
              <div className="text-sm font-medium capitalize">{ticket.category}</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-1">Priority</div>
              <div className="text-sm font-medium capitalize">{ticket.priority}</div>
            </div>
            <div>
              <div className="text-xs text-white/40 mb-1">Assigned Agent</div>
              <div className="text-sm font-medium">
                {ticket.assignedTo ? ticket.assignedTo.name : <span className="text-white/30 italic">Unassigned</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
