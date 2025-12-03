import { z } from "zod";

export const createReturnItemSchema = z.object({
  retailer_id: z.string().uuid("Invalid retailer ID"),
  name: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  purchase_date: z.string().datetime("Invalid date format"),
});

export const updateReturnItemSchema = z.object({
  retailer_id: z.string().uuid("Invalid retailer ID").optional(),
  name: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  purchase_date: z.string().datetime("Invalid date format").optional(),
  user_id: z.string().uuid("Invalid user ID"),
});

export const patchReturnItemSchema = z.object({
  is_returned: z.boolean().optional(),
  is_kept: z.boolean().optional(),
  user_id: z.string().uuid("Invalid user ID"),
});

export type CreateReturnItemInput = z.infer<typeof createReturnItemSchema>;
export type UpdateReturnItemInput = z.infer<typeof updateReturnItemSchema>;
export type PatchReturnItemInput = z.infer<typeof patchReturnItemSchema>;
