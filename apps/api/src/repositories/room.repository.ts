import { prisma } from '../config/db';
import { DEFAULT_ROLE_PERMISSIONS } from '@collabroom/shared';

export class RoomRepository {
  static async create(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    privacy?: string;
    createdById: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: data.name,
          description: data.description,
          icon: data.icon || 'FolderKanban',
          color: data.color || '#4F46E5',
          privacy: data.privacy || 'PRIVATE',
          createdById: data.createdById,
        },
      });

      // Automatically add creator as OWNER member with full permissions
      const member = await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: data.createdById,
          role: 'OWNER',
        },
      });

      await tx.roomMemberPermission.create({
        data: {
          roomMemberId: member.id,
          ...DEFAULT_ROLE_PERMISSIONS.OWNER,
        },
      });

      return room;
    });
  }

  static async findById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: true,
            files: { where: { isTrash: false } },
            folders: { where: { isTrash: false } },
          },
        },
      },
    });
  }

  static async listUserRooms(userId: string, filter?: 'owned' | 'shared' | 'all', search?: string) {
    const where: any = {
      isArchived: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (filter === 'owned') {
      where.createdById = userId;
    } else if (filter === 'shared') {
      where.createdById = { not: userId };
      where.members = { some: { userId } };
    } else {
      where.members = { some: { userId } };
    }

    return prisma.room.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        members: {
          where: { userId },
          include: {
            permission: true,
          },
        },
        favorites: {
          where: { userId, fileId: null, folderId: null },
        },
        _count: {
          select: {
            members: true,
            files: { where: { isTrash: false } },
          },
        },
      },
    });
  }

  static async update(id: string, data: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    privacy?: string;
    isArchived?: boolean;
  }) {
    return prisma.room.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.room.delete({
      where: { id },
    });
  }

  static async calculateStorageUsed(roomId: string): Promise<bigint> {
    const result = await prisma.file.aggregate({
      where: { roomId, isTrash: false },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes || BigInt(0);
  }
}
