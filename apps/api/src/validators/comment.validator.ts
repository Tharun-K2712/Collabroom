import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
  parentId: z.string().uuid().optional().nullable(),
});

export const askAiSchema = z.object({
  roomId: z.string().uuid('Valid room ID is required'),
  query: z.string().min(2, 'Query must be at least 2 characters').max(1000),
  fileIds: z.array(z.string().uuid()).optional(),
});
