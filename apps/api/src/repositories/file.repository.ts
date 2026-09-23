import { prisma } from '../config/db';

export class FileRepository {
  static async create(data: {
    name: string;
    originalName: string;
    mimeType: string;
    extension: string;
    sizeBytes: bigint | number;
    storageKey: string;
    roomId: string;
    folderId?: string | null;
    uploadedById: string;
  }) {
    const size = typeof data.sizeBytes === 'number' ? BigInt(data.sizeBytes) : data.sizeBytes;

    return prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          name: data.name,
          originalName: data.originalName,
          mimeType: data.mimeType,
          extension: data.extension.toLowerCase(),
          sizeBytes: size,
          storageKey: data.storageKey,
          roomId: data.roomId,
          folderId: data.folderId || null,
          uploadedById: data.uploadedById,
          currentVersion: 1,
        },
        include: {
          uploader: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      });

      // Create initial version record
      await tx.fileVersion.create({
        data: {
          fileId: file.id,
          versionNumber: 1,
          storageKey: data.storageKey,
          sizeBytes: size,
          uploadedById: data.uploadedById,
          changeSummary: 'Initial upload',
        },
      });

      // Increment user storage used
      await tx.user.update({
        where: { id: data.uploadedById },
        data: {
          storageUsedBytes: { increment: size },
        },
      });

      return file;
    });
  }

  static async findById(id: string) {
    return prisma.file.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        folder: true,
        room: {
          select: { id: true, name: true, createdById: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            uploader: {
              select: { id: true, fullName: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });
  }

  static async listRoomFiles(
    roomId: string,
    options: {
      folderId?: string | null;
      isTrash?: boolean;
      search?: string;
      extension?: string;
      page?: number;
      limit?: number;
      userId?: string;
    } = {}
  ) {
    const { folderId, isTrash = false, search, extension, page = 1, limit = 50, userId } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      roomId,
      isTrash,
    };

    if (folderId !== undefined) {
      where.folderId = folderId;
    }

    if (extension) {
      where.extension = extension.toLowerCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { originalName: { contains: search } },
      ];
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          uploader: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          folder: {
            select: { id: true, name: true, color: true },
          },
          favorites: userId
            ? {
                where: { userId },
              }
            : false,
          _count: {
            select: { comments: true, versions: true },
          },
        },
      }),
      prisma.file.count({ where }),
    ]);

    return { files, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async listTrashFiles(roomId?: string, userId?: string) {
    const where: any = {
      isTrash: true,
    };

    if (roomId) {
      where.roomId = roomId;
    }

    return prisma.file.findMany({
      where,
      orderBy: { deletedAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        room: {
          select: { id: true, name: true },
        },
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      folderId?: string | null;
      isTrash?: boolean;
      deletedAt?: Date | null;
      storageKey?: string;
      sizeBytes?: bigint | number;
      currentVersion?: number;
    }
  ) {
    const updateData: any = { ...data };
    if (typeof data.sizeBytes === 'number') {
      updateData.sizeBytes = BigInt(data.sizeBytes);
    }
    return prisma.file.update({
      where: { id },
      data: updateData,
    });
  }

  static async createVersion(data: {
    fileId: string;
    versionNumber: number;
    storageKey: string;
    sizeBytes: bigint | number;
    uploadedById: string;
    changeSummary?: string;
  }) {
    const size = typeof data.sizeBytes === 'number' ? BigInt(data.sizeBytes) : data.sizeBytes;

    return prisma.$transaction(async (tx) => {
      const version = await tx.fileVersion.create({
        data: {
          fileId: data.fileId,
          versionNumber: data.versionNumber,
          storageKey: data.storageKey,
          sizeBytes: size,
          uploadedById: data.uploadedById,
          changeSummary: data.changeSummary,
        },
      });

      await tx.file.update({
        where: { id: data.fileId },
        data: {
          currentVersion: data.versionNumber,
          storageKey: data.storageKey,
          sizeBytes: size,
        },
      });

      return version;
    });
  }

  static async deletePermanently(id: string) {
    return prisma.$transaction(async (tx) => {
      const file = await tx.file.findUnique({
        where: { id },
        include: { versions: true },
      });

      if (!file) return null;

      await tx.user.update({
        where: { id: file.uploadedById },
        data: {
          storageUsedBytes: {
            decrement: file.sizeBytes,
          },
        },
      });

      await tx.file.delete({
        where: { id },
      });

      return file;
    });
  }
}
