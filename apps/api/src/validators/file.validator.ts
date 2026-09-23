import { z } from 'zod';

export const requestUploadUrlSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  originalName: z.string().min(1, 'Original file name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  sizeBytes: z.number().positive('File size must be greater than 0'),
  folderId: z.string().uuid().optional().nullable(),
});

export const completeFileUploadSchema = z.object({
  name: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  extension: z.string().optional(),
  sizeBytes: z.number().positive(),
  storageKey: z.string().min(1),
  folderId: z.string().uuid().optional().nullable(),
});

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().optional().nullable(),
  isTrash: z.boolean().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().optional(),
  isTrash: z.boolean().optional(),
});

export const createNewVersionSchema = z.object({
  sizeBytes: z.number().positive(),
  storageKey: z.string().min(1),
  changeSummary: z.string().max(300).optional(),
});
