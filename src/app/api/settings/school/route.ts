export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SchoolSettings from "@/lib/models/schoolSettings";
import { getAuthUser } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    let settings = await SchoolSettings.findOne({ school: authUser.schoolContext?._id }).lean();
    if (!settings) {
      settings = await SchoolSettings.create({ school: authUser.schoolContext?._id });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Not authorized" }, { status: 401 });

    const data = await req.json();
    let settings = await SchoolSettings.findOne({ school: authUser.schoolContext?._id }).lean();
    
    if (settings) {
      settings = await SchoolSettings.findByIdAndUpdate(settings._id, data, { new: true });
    } else {
      settings = await SchoolSettings.create({ ...data, school: authUser.schoolContext?._id });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
