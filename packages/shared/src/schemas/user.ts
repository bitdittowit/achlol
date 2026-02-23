import { z } from "zod";

export const userSchema = z.object({
  id: z.number().int().positive(),
  telegramId: z.string(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const createUserBodySchema = z.object({
  telegramId: z.string(),
  username: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
});

export type User = z.infer<typeof userSchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
