import { prisma } from '../config/db';

export class SearchService {
  static async globalSearch(userId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return { rooms: [], files: [], folders: [] };
    }

    const cleanQuery = query.trim();

    // 1. Search rooms where user is a member
    const rooms = await prisma.room.findMany({
      where: {
        isArchived: false,
        members: { some: { userId } },
        OR: [
          { name: { contains: cleanQuery } },
          { description: { contains: cleanQuery } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        updatedAt: true,
      },
    });

    // 2. Search files in rooms user is a member of
    const files = await prisma.file.findMany({
      where: {
        isTrash: false,
        room: { members: { some: { userId } } },
        OR: [
          { name: { contains: cleanQuery } },
          { originalName: { contains: cleanQuery } },
        ],
      },
      take: 20,
      include: {
        room: { select: { id: true, name: true } },
        uploader: { select: { id: true, fullName: true } },
      },
    });

    // 3. Search folders in rooms user is a member of
    const folders = await prisma.folder.findMany({
      where: {
        isTrash: false,
        room: { members: { some: { userId } } },
        name: { contains: cleanQuery },
      },
      take: 10,
      include: {
        room: { select: { id: true, name: true } },
      },
    });

    return {
      rooms,
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        originalName: f.originalName,
        mimeType: f.mimeType,
        extension: f.extension,
        sizeBytes: f.sizeBytes.toString(),
        roomId: f.roomId,
        roomName: f.room.name,
        uploaderName: f.uploader.fullName,
        updatedAt: f.updatedAt.toISOString(),
      })),
      folders,
    };
  }
}
