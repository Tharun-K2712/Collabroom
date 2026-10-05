import { prisma } from '../config/db';
import { DEFAULT_ROLE_PERMISSIONS, RoomMemberPermissions, MemberRole } from '@/types/shared';

export class MemberRepository {
  static async findMember(roomId: string, userId: string) {
    return prisma.roomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            bio: true,
            systemRole: true,
            status: true,
            storageUsedBytes: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        permission: true,
      },
    });
  }

  static async listMembers(roomId: string) {
    return prisma.roomMember.findMany({
      where: { roomId },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            bio: true,
            systemRole: true,
            status: true,
            storageUsedBytes: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        permission: true,
      },
    });
  }

  static async addMember(roomId: string, userId: string, role: string = 'VIEWER') {
    return prisma.$transaction(async (tx) => {
      const member = await tx.roomMember.create({
        data: {
          roomId,
          userId,
          role,
        },
        include: {
          user: true,
        },
      });

      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role as MemberRole] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
      const permissions = await tx.roomMemberPermission.create({
        data: {
          roomMemberId: member.id,
          ...roleDefaults,
        },
      });

      return { ...member, permission: permissions };
    });
  }

  static async updateRole(roomId: string, userId: string, newRole: string) {
    return prisma.$transaction(async (tx) => {
      const member = await tx.roomMember.update({
        where: { roomId_userId: { roomId, userId } },
        data: { role: newRole },
      });

      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[newRole as MemberRole] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
      await tx.roomMemberPermission.upsert({
        where: { roomMemberId: member.id },
        update: { ...roleDefaults },
        create: {
          roomMemberId: member.id,
          ...roleDefaults,
        },
      });

      return member;
    });
  }

  static async updatePermissions(roomMemberId: string, permissions: Partial<RoomMemberPermissions>) {
    return prisma.roomMemberPermission.update({
      where: { roomMemberId },
      data: permissions,
    });
  }

  static async removeMember(roomId: string, userId: string) {
    return prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  static async updateLastActive(roomId: string, userId: string) {
    return prisma.roomMember.updateMany({
      where: { roomId, userId },
      data: { lastActiveAt: new Date() },
    });
  }

  static async createInvitation(data: {
    roomId: string;
    email: string;
    invitedById: string;
    role: string;
    token: string;
    expiresAt: Date;
  }) {
    return prisma.invitation.create({
      data,
      include: {
        room: true,
        inviter: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async findInvitationByToken(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: {
        room: true,
        inviter: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  static async updateInvitationStatus(id: string, status: string) {
    return prisma.invitation.update({
      where: { id },
      data: { status },
    });
  }

  static async createInviteLink(data: {
    roomId: string;
    code: string;
    defaultRole: string;
    createdById: string;
    expiresAt?: Date;
    maxUses?: number;
  }) {
    return prisma.roomInviteLink.create({
      data,
    });
  }

  static async findInviteLinkByCode(code: string) {
    return prisma.roomInviteLink.findUnique({
      where: { code },
      include: { room: true },
    });
  }

  static async incrementInviteLinkUsage(id: string) {
    return prisma.roomInviteLink.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
