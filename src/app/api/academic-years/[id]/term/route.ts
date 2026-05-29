import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AcademicYear from "@/lib/models/academicYear";
import { getAuthUser } from "@/middleware/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser(req, ["admin"]);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { activeTerm } = await req.json();

    if (!["Term 1", "Term 2", "Term 3"].includes(activeTerm)) {
      return NextResponse.json(
        { message: "Invalid term" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const year = await AcademicYear.findById(id);
    if (!year) {
      return NextResponse.json(
        { message: "Academic Year not found" },
        { status: 404 }
      );
    }

    year.activeTerm = activeTerm;
    year.term = activeTerm; // Keep legacy term synced
    await year.save();

    return NextResponse.json(year, { status: 200 });
  } catch (error) {
    console.error("Error updating active term:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
