import { MemberRepository } from '../repositories/member.repository';
import { UserRepository } from '../repositories/user.repository';
import { RoomRepository } from '../repositories/room.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import { MemberRole, RoomMemberPermissions } from '@collabroom/shared';
import crypto from 'crypto';

export class MemberService {
  static async listMembers(roomId: string) {
    const members = await MemberRepository.listMembers(roomId);
    return members.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      role: m.role as MemberRole,
      joinedAt: m.joinedAt.toISOString(),
      lastActiveAt: m.lastActiveAt.toISOString(),
      user: {
        id: m.user.id,
        email: m.user.email,
        fullName: m.user.fullName,
        avatarUrl: m.user.avatarUrl,
        phone: m.user.phone,
        bio: m.user.bio,
        systemRole: m.user.systemRole as any,
        status: m.user.status as any,
        storageUsedBytes: m.user.storageUsedBytes.toString(),
        isEmailVerified: m.user.isEmailVerified,
        createdAt: m.user.createdAt.toISOString(),
      },
      permission: m.permission
        ? {
            canView: m.permission.canView,
            canUpload: m.permission.canUpload,
            canDownload: m.permission.canDownload,
            canEdit: m.permission.canEdit,
            canDelete: m.permission.canDelete,
            canRename: m.permission.canRename,
            canMove: m.permission.canMove,
            canShare: m.permission.canShare,
            canManageMembers: m.permission.canManageMembers,
            canManagePermissions: m.permission.canManagePermissions,
          }
        : undefined,
    }));
  }

  static async inviteMember(
    roomId: string,
    inviterId: string,
    data: { email: string; role: 'MANAGER' | 'EDITOR' | 'VIEWER' }
  ) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    const inviter = await UserRepository.findById(inviterId);

    const targetUser = await UserRepository.findByEmail(data.email);
    if (targetUser) {
      const existingMember = await MemberRepository.findMember(roomId, targetUser.id);
      if (existingMember) {
        throw new ConflictError('User is already a member of this room');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await MemberRepository.createInvitation({
      roomId,
      email: data.email.toLowerCase(),
      invitedById: inviterId,
      role: data.role,
      token,
      expiresAt,
    });

    await ActivityRepository.log({
      roomId,
      userId: inviterId,
      action: 'MEMBER_INVITED',
      entityType: 'MEMBER',
      entityId: invitation.id,
      details: { email: data.email, role: data.role },
    });

    if (targetUser) {
      await NotificationRepository.create({
        userId: targetUser.id,
        roomId,
        type: 'INVITATION_RECEIVED',
        title: `Invited to ${room.name}`,
        message: `${inviter?.fullName || 'Someone'} invited you to join "${room.name}" as ${data.role}.`,
        link: `/invite/${token}`,
      });
    }

    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      inviteUrl: `/invite/${token}`,
      expiresAt: invitation.expiresAt,
    };
  }

  static async createInviteLink(
    roomId: string,
    userId: string,
    data: { defaultRole?: 'MANAGER' | 'EDITOR' | 'VIEWER'; expiresInHours?: number; maxUses?: number }
  ) {
    const code = crypto.randomBytes(8).toString('hex');
    const expiresAt = data.expiresInHours ? new Date(Date.now() + data.expiresInHours * 3600000) : undefined;

    const link = await MemberRepository.createInviteLink({
      roomId,
      code,
      defaultRole: data.defaultRole || 'VIEWER',
      createdById: userId,
      expiresAt,
      maxUses: data.maxUses,
    });

    return {
      code: link.code,
      inviteUrl: `/invite/${link.code}`,
      defaultRole: link.defaultRole,
      expiresAt: link.expiresAt,
    };
  }

  static async acceptInvitation(tokenOrCode: string, userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const invitation = await MemberRepository.findInvitationByToken(tokenOrCode);
    if (invitation) {
      if (invitation.status !== 'PENDING') {
        throw new BadRequestError(`Invitation has already been ${invitation.status.toLowerCase()}`);
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        await MemberRepository.updateInvitationStatus(invitation.id, 'EXPIRED');
        throw new BadRequestError('Invitation has expired');
      }

      const member = await MemberRepository.addMember(invitation.roomId, userId, invitation.role);
      await MemberRepository.updateInvitationStatus(invitation.id, 'ACCEPTED');

      await ActivityRepository.log({
        roomId: invitation.roomId,
        userId,
        action: 'MEMBER_JOINED',
        entityType: 'MEMBER',
        entityId: member.id,
        details: { role: invitation.role },
      });

      return { roomId: invitation.roomId, role: invitation.role };
    }

    const inviteLink = await MemberRepository.findInviteLinkByCode(tokenOrCode);
    if (inviteLink) {
      if (!inviteLink.isActive) {
        throw new BadRequestError('This invite link is no longer active');
      }
      if (inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date()) {
        throw new BadRequestError('This invite link has expired');
      }
      if (inviteLink.maxUses && inviteLink.usedCount >= inviteLink.maxUses) {
        throw new BadRequestError('This invite link has reached its maximum usage limit');
      }

      const existingMember = await MemberRepository.findMember(inviteLink.roomId, userId);
      if (existingMember) {
        return { roomId: inviteLink.roomId, role: existingMember.role, alreadyMember: true };
      }

      const member = await MemberRepository.addMember(inviteLink.roomId, userId, inviteLink.defaultRole);
      await MemberRepository.incrementInviteLinkUsage(inviteLink.id);

      await ActivityRepository.log({
        roomId: inviteLink.roomId,
        userId,
        action: 'MEMBER_JOINED',
        entityType: 'MEMBER',
        entityId: member.id,
        details: { via: 'LINK', role: inviteLink.defaultRole },
      });

      return { roomId: inviteLink.roomId, role: inviteLink.defaultRole };
    }

    throw new NotFoundError('Invalid invitation or invite link');
  }

  static async updateMemberRole(roomId: string, targetUserId: string, operatorId: string, newRole: MemberRole) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    if (targetUserId === room.createdById && newRole !== 'OWNER') {
      throw new ForbiddenError('Room owner role cannot be downgraded');
    }

    const updated = await MemberRepository.updateRole(roomId, targetUserId, newRole);

    await ActivityRepository.log({
      roomId,
      userId: operatorId,
      action: 'PERMISSION_CHANGED',
      entityType: 'MEMBER',
      entityId: targetUserId,
      details: { newRole },
    });

    await NotificationRepository.create({
      userId: targetUserId,
      roomId,
      type: 'ROLE_CHANGED',
      title: `Role updated in ${room.name}`,
      message: `Your role has been changed to ${newRole}.`,
      link: `/rooms/${roomId}`,
    });

    return updated;
  }

  static async updateCustomPermissions(
    roomId: string,
    targetUserId: string,
    operatorId: string,
    permissions: Partial<RoomMemberPermissions>
  ) {
    const member = await MemberRepository.findMember(roomId, targetUserId);
    if (!member) throw new NotFoundError('Member not found in room');

    if (member.role === 'OWNER') {
      throw new BadRequestError('Cannot override owner permissions');
    }

    if (!member.permission) {
      throw new NotFoundError('Permission record not found for member');
    }

    const updated = await MemberRepository.updatePermissions(member.permission.id, permissions);

    await ActivityRepository.log({
      roomId,
      userId: operatorId,
      action: 'PERMISSION_CHANGED',
      entityType: 'MEMBER',
      entityId: targetUserId,
      details: permissions,
    });

    return updated;
  }

  static async removeMember(roomId: string, targetUserId: string, operatorId: string) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    if (targetUserId === room.createdById) {
      throw new ForbiddenError('Cannot remove room owner');
    }

    await MemberRepository.removeMember(roomId, targetUserId);

    await ActivityRepository.log({
      roomId,
      userId: operatorId,
      action: 'MEMBER_REMOVED',
      entityType: 'MEMBER',
      entityId: targetUserId,
    });

    return { message: 'Member removed from room' };
  }
}
