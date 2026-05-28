import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Material from "@/lib/models/material";
import Class from "@/lib/models/class";
import Subject from "@/lib/models/subject";
import User from "@/lib/models/user";
import { getAuthUser } from "@/middleware/auth";
import { logActivity } from "@/lib/utils/activitieslog";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const search = searchParams.get("search");

    const query: any = {};
    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const [total, materials] = await Promise.all([
      Material.countDocuments(query),
      Material.find(query)
        .populate("classId", "name")
        .populate("subjectId", "name code")
        .populate("uploader", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    return NextResponse.json({
      materials,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("MATERIALS GET ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin", "teacher"]);
    if (!authUser) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const { title, description, type, url, classId, subjectId } = await req.json();

    const newMaterial = await Material.create({
      title,
      description,
      type,
      url,
      classId,
      subjectId,
      uploader: authUser._id,
    });

    await logActivity({
      userId: authUser._id.toString(),
      action: "Uploaded Study Material",
      details: `Title: ${title}`,
    });

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    console.error("MATERIALS POST ERROR", error);
    return NextResponse.json({ message: "Server Error", error }, { status: 500 });
  }
}
