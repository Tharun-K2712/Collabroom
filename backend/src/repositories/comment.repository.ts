import { prisma } from '../config/db';

export class CommentRepository {
  static async create(data: { fileId: string; userId: string; content: string; parentId?: string | null }) {
    return prisma.comment.create({
      data: {
        fileId: data.fileId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId || null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  static async findById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  static async listByFileId(fileId: string) {
    return prisma.comment.findMany({
      where: { fileId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  static async delete(id: string) {
    return prisma.comment.delete({
      where: { id },
    });
  }
}
