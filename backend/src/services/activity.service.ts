import { ActivityRepository } from '../repositories/activity.repository';
import { NotificationRepository } from '../repositories/notification.repository';

export class ActivityService {
  static async listRoomActivities(roomId: string, limit = 50) {
    const logs = await ActivityRepository.listRoomActivities(roomId, limit);
    return logs.map((log) => ({
      id: log.id,
      roomId: log.roomId,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      user: log.user,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  static async listUserActivities(userId: string, limit = 50) {
    const logs = await ActivityRepository.listUserActivities(userId, limit);
    return logs.map((log) => ({
      id: log.id,
      roomId: log.roomId,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      user: log.user,
      room: (log as any).room,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}

export class NotificationService {
  static async listNotifications(userId: string, limit = 50) {
    const notifications = await NotificationRepository.listUserNotifications(userId, limit);
    return notifications.map((n: any) => ({
      id: n.id,
      userId: n.userId,
      roomId: n.roomId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  static async markAsRead(id: string, userId: string) {
    return NotificationRepository.markAsRead(id, userId);
  }

  static async markAllAsRead(userId: string) {
    return NotificationRepository.markAllAsRead(userId);
  }
}
