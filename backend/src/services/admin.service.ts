import { prisma } from '../config/db';

export class AdminService {
  static async getSystemStats() {
    const [totalUsers, totalRooms, totalFiles, totalStorage] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.file.count({ where: { isTrash: false } }),
      prisma.file.aggregate({
        where: { isTrash: false },
        _sum: { sizeBytes: true },
      }),
    ]);

    const activeUsers = await prisma.user.count({
      where: { status: 'ACTIVE' },
    });

    return {
      totalUsers,
      totalRooms,
      totalFiles,
      totalStorageBytes: (totalStorage._sum.sizeBytes || BigInt(0)).toString(),
      activeUsers,
    };
  }

  static async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          systemRole: true,
          status: true,
          storageUsedBytes: true,
          createdAt: true,
          _count: {
            select: {
              ownedRooms: true,
              roomMemberships: true,
              uploadedFiles: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        storageUsedBytes: u.storageUsedBytes.toString(),
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async updateUserStatus(userId: string, status: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    return {
      id: updated.id,
      email: updated.email,
      status: updated.status,
    };
  }

  static async listAllRooms(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
          _count: { select: { members: true, files: true } },
        },
      }),
      prisma.room.count(),
    ]);

    return {
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        color: r.color,
        privacy: r.privacy,
        maxStorageBytes: r.maxStorageBytes.toString(),
        owner: r.owner,
        memberCount: r._count.members,
        fileCount: r._count.files,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
