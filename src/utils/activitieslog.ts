import ActivitiesLog from "@/lib/models/activitieslog";

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
    await ActivitiesLog.create({
      user: userId,
      action,
      details,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
