import { FolderRepository } from '../repositories/folder.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { NotFoundError } from '../utils/errors';

export class FolderService {
  static async createFolder(
    roomId: string,
    userId: string,
    data: { name: string; parentId?: string | null; color?: string }
  ) {
    const folder = await FolderRepository.create({
      name: data.name,
      roomId,
      parentId: data.parentId,
      createdById: userId,
      color: data.color,
    });

    await ActivityRepository.log({
      roomId,
      userId,
      action: 'FOLDER_CREATED',
      entityType: 'FOLDER',
      entityId: folder.id,
      details: { name: folder.name },
    });

    return folder;
  }

  static async listFolders(roomId: string, parentId?: string | null) {
    return FolderRepository.listRoomFolders(roomId, parentId);
  }

  static async updateFolder(
    folderId: string,
    userId: string,
    data: { name?: string; parentId?: string | null; color?: string; isTrash?: boolean }
  ) {
    const folder = await FolderRepository.findById(folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    const updatePayload: any = { ...data };
    if (data.isTrash !== undefined) {
      updatePayload.deletedAt = data.isTrash ? new Date() : null;
    }

    const updated = await FolderRepository.update(folderId, updatePayload);

    await ActivityRepository.log({
      roomId: folder.roomId,
      userId,
      action: data.isTrash ? 'FOLDER_DELETED' : 'FOLDER_UPDATED',
      entityType: 'FOLDER',
      entityId: folderId,
      details: data,
    });

    return updated;
  }

  static async deleteFolderPermanently(folderId: string, userId: string) {
    const folder = await FolderRepository.findById(folderId);
    if (!folder) throw new NotFoundError('Folder not found');

    await ActivityRepository.log({
      roomId: folder.roomId,
      userId,
      action: 'FOLDER_DELETED_PERMANENTLY',
      entityType: 'FOLDER',
      entityId: folderId,
      details: { name: folder.name },
    });

    await FolderRepository.deletePermanently(folderId);
    return { message: 'Folder deleted permanently' };
  }
}
