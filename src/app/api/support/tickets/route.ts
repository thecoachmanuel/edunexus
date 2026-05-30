import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/middleware/auth";
import SupportTicket from "@/lib/models/supportTicket";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import { getSchoolFeatures } from "@/lib/utils/planEnforcer";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// GET /api/support/tickets — List tickets for a school
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const tickets = await SupportTicket.find({ school: authUser.schoolContext?._id })
      .sort({ lastActivityAt: -1 })
      .select("-messages")
      .lean();

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/support/tickets — Create a new ticket
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req, ["admin"]);
    if (!authUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { subject, category, message } = await req.json();

    const ticketNumber = `EDN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const planInfo = await getSchoolFeatures(authUser.schoolContext!._id.toString());
    const hasAI = planInfo.hasFeature("ai_support");

    // Get AI initial response
    let aiReply = "Thank you for reaching out! Our team will review your ticket shortly.";
    let status = hasAI ? "ai_handling" : "open";
    const messages: any[] = [
      {
        sender: "school",
        senderName: authUser.name,
        content: message,
        timestamp: new Date(),
        isRead: false,
      }
    ];

    if (hasAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const aiPrompt = `You are EduNexus Support AI. A school admin has opened a ${category} support ticket with subject: "${subject}" and message: "${message}". 

  Provide a helpful, professional initial response in 2-3 short paragraphs. If you can solve the issue, do so. If you cannot, say that a human agent will follow up shortly. Be warm, specific to school management context, and concise.`;

        const result = await model.generateContent(aiPrompt);
        aiReply = result.response.text();
        
        messages.push({
          sender: "ai",
          senderName: "EduNexus AI Support",
          content: aiReply,
          timestamp: new Date(),
          isRead: false,
        });
      } catch (aiError) {
        console.error("AI reply failed:", aiError);
      }
    }

    const ticket = await SupportTicket.create({
      school: authUser.schoolContext?._id,
      ticketNumber,
      subject,
      category,
      status,
      lastActivityAt: new Date(),
      messages,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
