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
    maxStudents = plan.features?.maxStudents === -1 ? 10000 : (plan.features?.maxStudents || 500);
    features = plan.features || [];
  } else if (school.isTrialActive) {
    // Generous trial limits
    maxStudents = 1000;
    features = ["attendance", "grading", "basic_reports", "lms", "finance", "advanced_analytics", "ai_support"];
  }

  // Count current students
  const studentCount = await User.countDocuments({ school: schoolId, role: "student" });

  let isPaymentRequired = false;

  if (school.isTrialActive && school.trialEndsAt && new Date() > school.trialEndsAt) {
    isPaymentRequired = true;
  } else if (!school.isTrialActive) {
    if (!school.subscription) {
      isPaymentRequired = true;
    } else if (
      school.subscription.status === "past_due" ||
      school.subscription.status === "expired" ||
      school.subscription.status === "cancelled"
    ) {
      isPaymentRequired = true;
    } else if (school.subscription.currentPeriodEnd && new Date() > school.subscription.currentPeriodEnd) {
      isPaymentRequired = true;
    }
  }

  return {
    planName: plan?.name || (school.isTrialActive ? "Free Trial" : "No Plan"),
    maxStudents,
    currentStudents: studentCount,
    features,
    canAddStudent: studentCount < maxStudents,
    hasFeature: (featureKey: string) => features.includes(featureKey),
    isTrial: school.isTrialActive,
    status: school.subscription?.status || (school.isTrialActive ? "trialing" : "inactive"),
    isPaymentRequired,
  };
}
