import { prisma } from '../config/db';

export class NotificationRepository {
  static async create(data: {
    userId: string;
    roomId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string | null;
  }) {
    return prisma.notification.create({
      data,
    });
  }

  static async listUserNotifications(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
