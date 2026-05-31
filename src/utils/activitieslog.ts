import ActivitiesLog from "@/lib/models/activitieslog";
import User from "@/lib/models/user";

interface LogActivityParams {
  userId: string;
  action: string;
  details?: string;
}

export const logActivity = async ({
  userId,
  action,
  details,
}: LogActivityParams) => {
  try {
    const user = await User.findById(userId).select("school").lean() as any;
    if (!user || !user.school) return;

    await ActivitiesLog.create({
      school: user.school,
      user: userId,
      action,
      details,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
