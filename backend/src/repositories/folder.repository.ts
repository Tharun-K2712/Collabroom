import { prisma } from '../config/db';

export class FolderRepository {
  static async create(data: {
    name: string;
    roomId: string;
    parentId?: string | null;
    createdById: string;
    color?: string;
  }) {
    return prisma.folder.create({
      data: {
        name: data.name,
        roomId: data.roomId,
        parentId: data.parentId || null,
        createdById: data.createdById,
        color: data.color || '#6366F1',
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  static async findById(id: string) {
    return prisma.folder.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { files: { where: { isTrash: false } }, subFolders: { where: { isTrash: false } } },
        },
      },
    });
  }

  static async listRoomFolders(roomId: string, parentId?: string | null, isTrash = false) {
    const where: any = {
      roomId,
      isTrash,
    };

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    return prisma.folder.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { files: { where: { isTrash: false } }, subFolders: { where: { isTrash: false } } },
        },
      },
    });
  }

  static async update(id: string, data: { name?: string; parentId?: string | null; color?: string; isTrash?: boolean; deletedAt?: Date | null }) {
    return prisma.folder.update({
      where: { id },
      data,
    });
  }

  static async deletePermanently(id: string) {
    return prisma.folder.delete({
      where: { id },
    });
  }
}
