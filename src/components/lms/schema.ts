import { z } from "zod";

export const materialFormSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["Document", "Video", "Link", "Other"]),
  url: z.string().url("Must be a valid URL"),
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;
