import { z } from "zod";

export const formSchema = z.object({
  name: z.string().min(1, "Name is required (e.g., 2024-2025)"),
  isCurrent: z.boolean(),
  activeTerm: z.string().min(1, "Initial active term is required"),
  terms: z.array(z.object({
    term: z.string(),
    startDate: z.date({ invalid_type_error: "Start date is required" }),
    endDate: z.date({ invalid_type_error: "End date is required" }),
  })).length(3),
});

export type FormValues = z.infer<typeof formSchema>;
