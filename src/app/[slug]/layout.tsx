import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import School from "@/lib/models/school";

// Validate the school slug on the server before rendering any child pages
export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await connectDB();
  const school = await School.findOne({ slug, isActive: true }).select("_id slug").lean();

  if (!school) {
    notFound();
  }

  return <>{children}</>;
}
