import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SupportTicket from "@/lib/models/supportTicket";

// GET /api/superadmin/tickets/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const ticket = await SupportTicket.findById(params.id)
      .populate("school", "name slug email")
      .populate("assignedTo", "name email");

    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT /api/superadmin/tickets/[id] (Change status)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { status } = await req.json();
    
    const updateData: any = { status, lastActivityAt: new Date() };
    if (status === "resolved") updateData.resolvedAt = new Date();
    if (status === "closed") updateData.closedAt = new Date();

    const ticket = await SupportTicket.findByIdAndUpdate(params.id, updateData, { new: true })
      .populate("school", "name slug")
      .populate("assignedTo", "name");

    return NextResponse.json({ message: "Status updated", ticket });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
