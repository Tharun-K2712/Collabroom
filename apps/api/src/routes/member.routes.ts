import { Router } from 'express';
import { MemberController } from '../controllers/room.controller';
import { authenticate } from '../middleware/auth';
import { requireRoomMember, requirePermission, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateMemberPermissionsSchema,
  createInviteLinkSchema,
} from '../validators/member.validator';
import { MemberRole } from '@collabroom/shared';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Join room using token or invite link code
router.post('/accept/:token', MemberController.acceptInvitation);

// Room members list
router.get('/:roomId/members', requireRoomMember(), MemberController.listMembers);

// Send invite by email
router.post(
  '/:roomId/invitations',
  requireRoomMember(),
  requirePermission('canManageMembers'),
  validate(inviteMemberSchema),
  MemberController.inviteMember
);

// Create shareable invite link
router.post(
  '/:roomId/invite-links',
  requireRoomMember(),
  requirePermission('canManageMembers'),
  validate(createInviteLinkSchema),
  MemberController.createInviteLink
);

// Change member role
router.patch(
  '/:roomId/members/:userId/role',
  requireRoomMember(),
  requireRole(['OWNER', 'MANAGER']),
  validate(updateMemberRoleSchema),
  MemberController.updateMemberRole
);

// Customize granular 10-point permissions
router.patch(
  '/:roomId/members/:userId/permissions',
  requireRoomMember(),
  requireRole(['OWNER']),
  validate(updateMemberPermissionsSchema),
  MemberController.updatePermissions
);

// Remove member
router.delete(
  '/:roomId/members/:userId',
  requireRoomMember(),
  requirePermission('canManageMembers'),
  MemberController.removeMember
);

export const memberRouter = router;
