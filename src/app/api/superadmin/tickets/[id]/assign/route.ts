import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSuperAuthUser } from "@/middleware/superAuth";
import SupportTicket from "@/lib/models/supportTicket";

// POST /api/superadmin/tickets/[id]/assign
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const superAdmin = await getSuperAuthUser(req);
    if (!superAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const ticket = await SupportTicket.findByIdAndUpdate(
      params.id,
      { assignedTo: superAdmin.user._id },
      { new: true }
    ).populate("assignedTo", "name email");

    if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

    return NextResponse.json({ message: "Assigned successfully", ticket });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
