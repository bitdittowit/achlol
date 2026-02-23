import { z } from "zod";

export const iconTypeSchema = z.enum(["auto", "prompt", "upload"]);
export const prankStatusSchema = z.enum(["planned", "completed"]);
export const mediaTypeSchema = z.enum(["photo", "video"]);

export const mediaSchema = z.object({
  id: z.number().int().positive(),
  prankId: z.number().int().positive(),
  type: mediaTypeSchema,
  filePath: z.string(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
});

export const prankSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  iconType: iconTypeSchema,
  iconPath: z.string().nullable(),
  fromField: z.string(),
  toField: z.string(),
  status: prankStatusSchema,
  scheduledAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  completionStoryText: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  media: z.array(mediaSchema).optional(),
});

export const createPrankBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  iconType: iconTypeSchema.default("auto"),
  fromField: z.string().min(1).max(200),
  toField: z.string().min(1).max(200),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const updatePrankBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  fromField: z.string().min(1).max(200).optional(),
  toField: z.string().min(1).max(200).optional(),
  status: prankStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  completionStoryText: z.string().max(5000).optional().nullable(),
});

export const prankListQuerySchema = z.object({
  status: prankStatusSchema.optional(),
});

export type IconType = z.infer<typeof iconTypeSchema>;
export type PrankStatus = z.infer<typeof prankStatusSchema>;
export type MediaType = z.infer<typeof mediaTypeSchema>;
export type Media = z.infer<typeof mediaSchema>;
export type Prank = z.infer<typeof prankSchema>;
export type CreatePrankBody = z.infer<typeof createPrankBodySchema>;
export type UpdatePrankBody = z.infer<typeof updatePrankBodySchema>;
export type PrankListQuery = z.infer<typeof prankListQuerySchema>;
