import { z } from "zod";

export const createReturnItemSchema = z.object({
  retailer_id: z.string().min(1, "Retailer ID is required"),
  name: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").default("USD"),
  purchase_date: z.string().datetime("Invalid date format"),
});

export const updateReturnItemSchema = z.object({
  retailer_id: z.string().min(1, "Retailer ID is required").optional(),
  name: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  purchase_date: z.string().datetime("Invalid date format").optional(),
  user_id: z.string().min(1, "User ID is required"),
});

export const patchReturnItemSchema = z.object({
  is_returned: z.boolean().optional(),
  is_kept: z.boolean().optional(),
  user_id: z.string().min(1, "User ID is required"),
});

export type CreateReturnItemInput = z.infer<typeof createReturnItemSchema>;
export type UpdateReturnItemInput = z.infer<typeof updateReturnItemSchema>;
export type PatchReturnItemInput = z.infer<typeof patchReturnItemSchema>;
