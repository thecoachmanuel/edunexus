"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Ticket, Send, Bot, User, Clock, Loader2, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

interface Message {
  sender: "school" | "ai" | "human_agent";
  senderName: string;
  content: string;
  timestamp: string;
}

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  messages: Message[];
  createdAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  // New Ticket Form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Technical Issue");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply Form
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get("/api/support/tickets");
      setTickets(res.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicket = async (id: string) => {
    try {
      const res = await axios.get(`/api/support/tickets/${id}`);
      setActiveTicket(res.data.ticket);
      setShowNewTicket(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post("/api/support/tickets", { subject, category, message });
      setTickets([res.data.ticket, ...tickets]);
      setActiveTicket(res.data.ticket);
      setShowNewTicket(false);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const res = await axios.post(`/api/support/tickets/${activeTicket._id}`, { message: replyMessage });
      setActiveTicket(res.data.ticket);
      setReplyMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, any> = {
      ai_handling: { bg: "bg-blue-500/10", text: "text-blue-500", label: "AI Handling", icon: Bot },
      escalated: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Escalated", icon: AlertTriangle },
      resolved: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Resolved", icon: CheckCircle2 },
      closed: { bg: "bg-slate-500/10", text: "text-slate-500", label: "Closed", icon: CheckCircle2 },
    };
    const conf = map[status] || map.ai_handling;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
        <conf.icon className="w-3.5 h-3.5" />
        {conf.label}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-violet-600" />
            Support Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Get help from our AI assistant or human support team.</p>
        </div>
        <button
          onClick={() => { setShowNewTicket(true); setActiveTicket(null); }}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <div className="flex-1 grid md:grid-cols-3 gap-6 overflow-hidden">
        {/* Sidebar List */}
        <div className="col-span-1 rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b font-semibold bg-muted/30">Your Tickets</div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No tickets found.</div>
            ) : (
              <div className="divide-y">
                {tickets.map(ticket => (
                  <button
                    key={ticket._id}
                    onClick={() => loadTicket(ticket._id)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition ${activeTicket?._id === ticket._id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm truncate pr-4">{ticket.subject}</div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-2 rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
          {showNewTicket ? (
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-lg font-bold mb-6">Create New Support Ticket</h2>
              <form onSubmit={handleCreateTicket} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option>Technical Issue</option>
                    <option>Billing Question</option>
                    <option>Feature Request</option>
                    <option>Account Management</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Subject</label>
                  <input
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full p-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    placeholder="Provide as much detail as possible..."
                    className="w-full p-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Ticket"}
                </button>
              </form>
            </div>
          ) : activeTicket ? (
            <>
              {/* Active Ticket Header */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
                <div>
                  <h2 className="font-bold text-lg">{activeTicket.subject}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{activeTicket.ticketNumber}</span>
                    <span>•</span>
                    <span>{activeTicket.category}</span>
                  </div>
                </div>
                <div>{getStatusBadge(activeTicket.status)}</div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/10">
                {activeTicket.messages.map((msg, i) => {
                  const isSchool = msg.sender === "school";
                  const isAI = msg.sender === "ai";
                  
                  return (
                    <div key={i} className={`flex gap-3 ${isSchool ? "justify-end" : "justify-start"}`}>
                      {!isSchool && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isAI ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"}`}>
                          {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${isSchool ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 mb-1 ${isSchool ? "justify-end" : "justify-start"}`}>
                          <span className="text-xs font-semibold">{msg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap ${
                          isSchool 
                            ? "bg-violet-600 text-white rounded-tr-sm" 
                            : isAI 
                              ? "bg-card border shadow-sm rounded-tl-sm"
                              : "bg-muted rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              {activeTicket.status !== "closed" && activeTicket.status !== "resolved" && (
                <div className="p-4 border-t bg-background">
                  <form onSubmit={handleReply} className="flex items-end gap-3">
                    <textarea
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 p-3 max-h-32 rounded-xl border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      rows={2}
                    />
                    <button
                      type="submit"
                      disabled={replying || !replyMessage.trim()}
                      className="h-[46px] px-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition flex items-center justify-center disabled:opacity-50"
                    >
                      {replying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                  {activeTicket.status === "ai_handling" && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      AI agent will respond instantly. If needed, the ticket will be escalated to a human.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Ticket className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a ticket from the left or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
