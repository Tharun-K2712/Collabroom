import { prisma } from '../config/db';

export class ActivityRepository {
  static async log(data: {
    roomId?: string | null;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    try {
      const detailsString = data.details
        ? typeof data.details === 'string'
          ? data.details
          : JSON.stringify(data.details)
        : null;

      return await prisma.activityLog.create({
        data: {
          ...data,
          details: detailsString,
        },
      });
    } catch (e) {
      console.error('Failed to write activity log:', e);
      return null;
    }
  }

  static async listRoomActivities(roomId: string, limit = 50) {
    const logs = await prisma.activityLog.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  static async listUserActivities(userId: string, limit = 50) {
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    const roomIds = memberships.map((m) => m.roomId);

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [{ userId }, { roomId: { in: roomIds } }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  static async listAll(limit = 100) {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        room: {
          select: { id: true, name: true },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }
}
