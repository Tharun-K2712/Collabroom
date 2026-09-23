import { prisma } from '../config/db';

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  static async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    avatarUrl?: string;
    systemRole?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        systemRole: data.systemRole || 'USER',
      },
    });
  }

  static async update(
    id: string,
    data: {
      fullName?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      phone?: string | null;
      passwordHash?: string;
      isEmailVerified?: boolean;
      status?: string;
      systemRole?: string;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async updateStorageUsed(id: string, deltaBytes: bigint) {
    const user = await prisma.user.findUnique({ where: { id }, select: { storageUsedBytes: true } });
    if (!user) return;
    const newTotal = user.storageUsedBytes + deltaBytes < BigInt(0) ? BigInt(0) : user.storageUsedBytes + deltaBytes;
    return prisma.user.update({
      where: { id },
      data: { storageUsedBytes: newTotal },
    });
  }

  static async listAll(page = 1, limit = 20, search?: string) {
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
          bio: true,
          phone: true,
          isEmailVerified: true,
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

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
