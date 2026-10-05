import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['MANAGER', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'EDITOR', 'VIEWER']),
});

export const updateMemberPermissionsSchema = z.object({
  canView: z.boolean().optional(),
  canUpload: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canRename: z.boolean().optional(),
  canMove: z.boolean().optional(),
  canShare: z.boolean().optional(),
  canManageMembers: z.boolean().optional(),
  canManagePermissions: z.boolean().optional(),
});

export const createInviteLinkSchema = z.object({
  defaultRole: z.enum(['MANAGER', 'EDITOR', 'VIEWER']).default('VIEWER'),
  expiresInHours: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
});
