import Plan from "@/lib/models/plan";
import School from "@/lib/models/school";
import User from "@/lib/models/user";

export async function getSchoolFeatures(schoolId: string) {
  const school = await School.findById(schoolId).populate({
    path: "subscription",
    populate: { path: "plan" },
  });

  if (!school) throw new Error("School not found");

  const subscription = school.subscription as any;
  const plan = subscription?.plan;

  // Resolve feature flags from the plan object
  const planFeatures = plan?.features || {};

  // maxStudents: -1 means Enterprise unlimited (capped at 10,000)
  const maxStudents = planFeatures.maxStudents === -1
    ? 10000
    : (planFeatures.maxStudents || (school.isTrialActive ? 1000 : 300));

  // Count current students
  const studentCount = await User.countDocuments({ school: schoolId, role: "student" });

  // Determine if payment/subscription is needed
  let isPaymentRequired = false;
  if (school.isTrialActive && school.trialEndsAt && new Date() > school.trialEndsAt) {
    isPaymentRequired = true;
  } else if (!school.isTrialActive) {
    if (!subscription) {
      isPaymentRequired = true;
    } else if (
      ["past_due", "expired", "cancelled"].includes(subscription.status)
    ) {
      isPaymentRequired = true;
    } else if (subscription.currentPeriodEnd && new Date() > new Date(subscription.currentPeriodEnd)) {
      isPaymentRequired = true;
    }
  }

  /**
   * hasFeature checks the plan features object.
   * For boolean flags (e.g. aiTimetableEnabled), returns true if enabled on plan OR on trial.
   * For trial schools, all standard features are enabled.
   */
  const hasFeature = (featureKey: string): boolean => {
    if (school.isTrialActive && !isPaymentRequired) {
      // Trial gets all features
      return true;
    }
    if (!plan) return false;
    // Look up the feature key on the plan features object
    const val = planFeatures[featureKey];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val > 0;
    return false;
  };

  return {
    planName: plan?.name || (school.isTrialActive ? "Free Trial" : "No Plan"),
    maxStudents,
    currentStudents: studentCount,
    canAddStudent: studentCount < maxStudents,
    hasFeature,
    isTrial: school.isTrialActive,
    status: subscription?.status || (school.isTrialActive ? "trialing" : "inactive"),
    isPaymentRequired,
    dailyTimetableLimit: planFeatures.aiTimetableDailyLimit ?? (school.isTrialActive ? 10 : 5),
  };
}
