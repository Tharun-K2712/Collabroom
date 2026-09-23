import { prisma } from '../config/db';

export class FavoriteRepository {
  static async toggleRoomFavorite(userId: string, roomId: string) {
    const existing = await prisma.favorite.findFirst({
      where: { userId, roomId, fileId: null, folderId: null },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: { userId, roomId },
      });
      return { isFavorite: true };
    }
  }

  static async toggleFileFavorite(userId: string, fileId: string) {
    const existing = await prisma.favorite.findFirst({
      where: { userId, fileId },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: { userId, fileId },
      });
      return { isFavorite: true };
    }
  }

  static async listUserFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: { id: true, name: true, description: true, icon: true, color: true },
        },
        file: {
          include: {
            uploader: {
              select: { id: true, fullName: true, email: true },
            },
            room: {
              select: { id: true, name: true },
            },
          },
        },
        folder: true,
      },
    });
  }
}
