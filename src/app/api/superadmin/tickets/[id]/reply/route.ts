import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SupportTicket from "@/lib/models/supportTicket";

// POST /api/superadmin/tickets/[id]/reply
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content) return NextResponse.json({ message: "Content is required" }, { status: 400 });

    const message = {
      sender: "human_agent",
      senderName: superAdmin.user.name,
      content,
      agentId: superAdmin.user._id,
      timestamp: new Date(),
      isRead: false,
    };

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { 
        $push: { messages: message },
        $set: { lastActivityAt: new Date(), status: "open" } // An agent reply means it's back to open/waiting for user
      },
      { new: true }
    );

    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ message: "Reply sent", ticket });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
