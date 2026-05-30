import Plan from "@/lib/models/plan";
import School from "@/lib/models/school";
import Subscription from "@/lib/models/subscription";
import User from "@/lib/models/user";

export async function getSchoolFeatures(schoolId: string) {
  const school = await School.findById(schoolId).populate({
    path: "subscription",
    populate: { path: "plan" },
  });

  if (!school) throw new Error("School not found");

  const plan = school.subscription?.plan;
  
  // Default features for Starter (or no plan if trial)
  let maxStudents = 500;
  let features = ["attendance", "grading", "basic_reports"];

  if (plan) {
    maxStudents = plan.maxStudents;
    features = plan.features || [];
  } else if (school.isTrialActive) {
    // Generous trial limits
    maxStudents = 1000;
    features = ["attendance", "grading", "basic_reports", "lms", "finance", "advanced_analytics", "ai_support"];
  }

  // Count current students
  const studentCount = await User.countDocuments({ school: schoolId, role: "student" });

  return {
    planName: plan?.name || (school.isTrialActive ? "Free Trial" : "No Plan"),
    maxStudents,
    currentStudents: studentCount,
    features,
    canAddStudent: studentCount < maxStudents,
    hasFeature: (featureKey: string) => features.includes(featureKey),
    isTrial: school.isTrialActive,
    status: school.subscription?.status || (school.isTrialActive ? "trialing" : "inactive"),
  };
}
