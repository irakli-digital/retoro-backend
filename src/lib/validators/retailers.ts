import { z } from "zod";

export const createRetailerSchema = z.object({
  name: z.string().min(1, "Retailer name is required"),
  return_window_days: z.number().int().min(0, "Return window must be 0 or greater"),
  website_url: z.string().url("Invalid URL").optional(),
  return_portal_url: z.string().url("Invalid URL").optional(),
  has_free_returns: z.boolean().default(false),
});

export type CreateRetailerInput = z.infer<typeof createRetailerSchema>;
