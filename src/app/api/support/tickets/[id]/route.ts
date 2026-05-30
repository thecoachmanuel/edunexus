import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SupportTicket from "@/lib/models/supportTicket";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSchoolFeatures } from "@/lib/utils/planEnforcer";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// GET /api/support/tickets/[id] — Get full ticket with messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const authUser = await getAuthUser(req, ["admin"]);
    const superAdmin = !authUser ? await getSuperAuthUser(req) : null;
    if (!authUser && !superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const ticket = await SupportTicket.findById(id).populate("assignedTo", "name email").lean();
    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/support/tickets/[id] — Reply to a ticket
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { message, escalate } = body;

    const authUser = await getAuthUser(req, ["admin"]);
    const superAdmin = !authUser ? await getSuperAuthUser(req) : null;
    if (!authUser && !superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    const isSchool = !!authUser;
    const senderName = isSchool ? authUser.name : (superAdmin?.superAdmin.name || "Support Agent");
    const sender = isSchool ? "school" : "human_agent";

    // Add the reply
    ticket.messages.push({
      sender,
      senderName,
      content: message,
      timestamp: new Date(),
      isRead: false,
    });

    ticket.lastActivityAt = new Date();

    // If escalating
    if (escalate && isSchool) {
      ticket.status = "escalated";
      ticket.escalatedAt = new Date();
    }

    // If school replied and ticket is in ai_handling, get AI response
    if (isSchool && ticket.status === "ai_handling") {
      const planInfo = await getSchoolFeatures(authUser.schoolContext!._id.toString());
      if (planInfo.hasFeature("ai_support")) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const conversationHistory = ticket.messages
            .slice(-6) // Last 6 messages for context
            .map((m: any) => `${m.senderName}: ${m.content}`)
            .join("\n");

          const aiPrompt = `You are EduNexus Support AI. Here is the current support conversation for a ${ticket.category} issue:

${conversationHistory}

Latest message from the school admin: "${message}"

Reply helpfully and concisely. If this requires human intervention (billing disputes, account access issues, data loss), say "I'm escalating this to our human support team who will reach out within 24 hours." Otherwise solve the issue.`;

          const result = await model.generateContent(aiPrompt);
          const aiReply = result.response.text();

          // Check if AI is escalating
          const needsHuman = aiReply.toLowerCase().includes("escalat") || aiReply.toLowerCase().includes("human support");

          ticket.messages.push({
            sender: "ai",
            senderName: "EduNexus AI Support",
            content: aiReply,
            timestamp: new Date(),
            isRead: false,
          });

          if (needsHuman) {
            ticket.status = "escalated";
            ticket.escalatedAt = new Date();
          }
        } catch (aiError) {
          console.error("AI reply failed:", aiError);
        }
      } else {
        // AI support feature was removed or downgraded
        ticket.status = "open";
      }
    }

    // If human agent replied, mark as resolved if they say so
    if (!isSchool) {
      ticket.status = "resolved";
    }

    await ticket.save();
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PATCH /api/support/tickets/[id] — Update ticket status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status, assignedTo } = await req.json();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (status === "resolved") ticket.resolvedAt = new Date();
    if (status === "closed") ticket.closedAt = new Date();

    ticket.lastActivityAt = new Date();
    await ticket.save();

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
