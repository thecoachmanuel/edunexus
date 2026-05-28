import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReportCard from "@/lib/models/reportCard";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized. Only admins can delete reports." }, { status: 401 });
    }

    const { id } = params;

    const deletedReport = await ReportCard.findByIdAndDelete(id);

    if (!deletedReport) {
      return NextResponse.json({ message: "Report card not found" }, { status: 404 });
    }

    await logActivity({
      userId: authUser._id.toString(),
      action: "Deleted Report Card",
      details: `Deleted report card ID: ${id}`,
    });

    return NextResponse.json({ message: "Report card deleted successfully" });
  } catch (error) {
    console.error("REPORT CARD DELETE ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
