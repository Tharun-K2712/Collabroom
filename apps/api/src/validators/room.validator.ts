import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  privacy: z.enum(['PRIVATE', 'INVITE_ONLY']).default('PRIVATE'),
});

export const updateRoomSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  privacy: z.enum(['PRIVATE', 'INVITE_ONLY']).optional(),
  isArchived: z.boolean().optional(),
});
