import { FileRepository } from '../repositories/file.repository';
import { StorageService } from './storage.service';
import { StorageProvider } from '../config/s3';
import { ActivityRepository } from '../repositories/activity.repository';
import { RoomRepository } from '../repositories/room.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { broadcastToRoom } from '../socket/socketHandler';
import path from 'path';

export class FileService {
  static async requestUploadUrl(
    roomId: string,
    data: { name: string; originalName: string; mimeType: string; sizeBytes: number; folderId?: string | null }
  ) {
    const room = await RoomRepository.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    const storage = await StorageService.getUploadUrl(roomId, data.originalName, data.mimeType, data.sizeBytes);
    return storage;
  }

  static async completeUpload(
    roomId: string,
    userId: string,
    data: {
      name: string;
      originalName: string;
      mimeType: string;
      extension?: string;
      sizeBytes: number;
      storageKey: string;
      folderId?: string | null;
    }
  ) {
    const ext = data.extension || path.extname(data.originalName).replace('.', '').toLowerCase() || 'dat';

    const file = await FileRepository.create({
      name: data.name,
      originalName: data.originalName,
      mimeType: data.mimeType,
      extension: ext,
      sizeBytes: data.sizeBytes,
      storageKey: data.storageKey,
      roomId,
      folderId: data.folderId,
      uploadedById: userId,
    });

    await ActivityRepository.log({
      roomId,
      userId,
      action: 'FILE_UPLOADED',
      entityType: 'FILE',
      entityId: file.id,
      details: { name: file.name, sizeBytes: data.sizeBytes, mimeType: data.mimeType },
    });

    const fileDTO = {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      extension: file.extension,
      sizeBytes: file.sizeBytes.toString(),
      storageKey: file.storageKey,
      roomId: file.roomId,
      folderId: file.folderId,
      uploadedById: file.uploadedById,
      uploader: file.uploader,
      currentVersion: file.currentVersion,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };

    broadcastToRoom(roomId, 'file:uploaded', { file: fileDTO, uploadedBy: userId });

    return fileDTO;
  }

  static async getDownloadUrl(fileId: string, userId: string, versionNumber?: number) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    let keyToDownload = file.storageKey;
    if (versionNumber && versionNumber !== file.currentVersion) {
      const version = file.versions.find((v) => v.versionNumber === versionNumber);
      if (!version) throw new NotFoundError('Requested file version not found');
      keyToDownload = version.storageKey;
    }

    const downloadUrl = await StorageService.getDownloadUrl(keyToDownload, file.originalName);

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'FILE_DOWNLOADED',
      entityType: 'FILE',
      entityId: file.id,
      details: { name: file.name, version: versionNumber || file.currentVersion },
    });

    return {
      downloadUrl,
      fileName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
    };
  }

  static async getFileDetails(fileId: string) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    return {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      extension: file.extension,
      sizeBytes: file.sizeBytes.toString(),
      storageKey: file.storageKey,
      roomId: file.roomId,
      folderId: file.folderId,
      folder: file.folder,
      room: file.room,
      uploadedById: file.uploadedById,
      uploader: file.uploader,
      isTrash: file.isTrash,
      currentVersion: file.currentVersion,
      versions: file.versions.map((v) => ({
        id: v.id,
        fileId: v.fileId,
        versionNumber: v.versionNumber,
        storageKey: v.storageKey,
        sizeBytes: v.sizeBytes.toString(),
        uploadedById: v.uploadedById,
        uploader: v.uploader,
        changeSummary: v.changeSummary,
        createdAt: v.createdAt.toISOString(),
      })),
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }

  static async listFiles(
    roomId: string,
    userId: string,
    options: { folderId?: string | null; isTrash?: boolean; search?: string; extension?: string; page?: number; limit?: number } = {}
  ) {
    const result = await FileRepository.listRoomFiles(roomId, { ...options, userId });
    return {
      ...result,
      files: result.files.map((file) => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: file.sizeBytes.toString(),
        storageKey: file.storageKey,
        roomId: file.roomId,
        folderId: file.folderId,
        folder: file.folder,
        uploadedById: file.uploadedById,
        uploader: file.uploader,
        isTrash: file.isTrash,
        isFavorite: file.favorites ? file.favorites.length > 0 : false,
        currentVersion: file.currentVersion,
        versionsCount: file._count.versions,
        commentsCount: file._count.comments,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      })),
    };
  }

  static async updateFile(
    fileId: string,
    userId: string,
    data: { name?: string; folderId?: string | null; isTrash?: boolean }
  ) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    const updatePayload: any = { ...data };
    if (data.isTrash !== undefined) {
      updatePayload.deletedAt = data.isTrash ? new Date() : null;
    }

    const updated = await FileRepository.update(fileId, updatePayload);

    let action = 'FILE_UPDATED';
    if (data.isTrash === true) action = 'FILE_DELETED';
    else if (data.isTrash === false) action = 'FILE_RESTORED';
    else if (data.name && data.name !== file.name) action = 'FILE_RENAMED';
    else if (data.folderId !== undefined && data.folderId !== file.folderId) action = 'FILE_MOVED';

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action,
      entityType: 'FILE',
      entityId: fileId,
      details: data,
    });

    broadcastToRoom(file.roomId, 'file:updated', { ...updated, sizeBytes: updated.sizeBytes.toString() });

    return updated;
  }

  static async createNewVersion(
    fileId: string,
    userId: string,
    data: { storageKey: string; sizeBytes: number; changeSummary?: string }
  ) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    const nextVersionNumber = file.currentVersion + 1;
    const version = await FileRepository.createVersion({
      fileId,
      versionNumber: nextVersionNumber,
      storageKey: data.storageKey,
      sizeBytes: data.sizeBytes,
      uploadedById: userId,
      changeSummary: data.changeSummary || `Version ${nextVersionNumber}`,
    });

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'FILE_VERSION_ADDED',
      entityType: 'FILE',
      entityId: fileId,
      details: { versionNumber: nextVersionNumber, sizeBytes: data.sizeBytes },
    });

    return {
      id: version.id,
      fileId: version.fileId,
      versionNumber: version.versionNumber,
      storageKey: version.storageKey,
      sizeBytes: version.sizeBytes.toString(),
      uploadedById: version.uploadedById,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt.toISOString(),
    };
  }

  static async restoreVersion(fileId: string, versionNumber: number, userId: string) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    const targetVersion = file.versions.find((v) => v.versionNumber === versionNumber);
    if (!targetVersion) throw new NotFoundError('Target version not found');

    await FileRepository.update(fileId, {
      storageKey: targetVersion.storageKey,
      sizeBytes: targetVersion.sizeBytes,
      currentVersion: targetVersion.versionNumber,
    });

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'FILE_VERSION_RESTORED',
      entityType: 'FILE',
      entityId: fileId,
      details: { restoredToVersion: versionNumber },
    });

    return { message: `File restored to version ${versionNumber}` };
  }

  static async deletePermanently(fileId: string, userId: string) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    // Delete storage objects
    for (const v of file.versions) {
      await StorageService.deleteFile(v.storageKey);
    }

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'FILE_DELETED_PERMANENTLY',
      entityType: 'FILE',
      entityId: fileId,
      details: { name: file.name },
    });

    await FileRepository.deletePermanently(fileId);
    broadcastToRoom(file.roomId, 'file:deleted', { fileId, roomId: file.roomId });
    return { message: 'File deleted permanently' };
  }

  static async getFileContent(fileId: string) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    const content = await StorageProvider.readObject(file.storageKey);
    const textExtensions = [
      'txt', 'md', 'markdown', 'json', 'json5', 'csv', 'tsv', 'ts', 'js', 'jsx', 'tsx',
      'html', 'css', 'scss', 'py', 'ipynb', 'yml', 'yaml', 'toml', 'ini', 'xml', 'doc',
      'docx', 'log', 'sh', 'bash', 'zsh', 'sql', 'r', 'c', 'cpp', 'h', 'hpp', 'cs',
      'java', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'lua', 'dart', 'graphql',
      'env', 'conf', 'dockerfile', 'gitignore', 'prisma', 'tex', 'properties'
    ];
    const isTextEditable = textExtensions.includes(file.extension.toLowerCase()) || file.mimeType.startsWith('text/');

    return {
      fileId: file.id,
      name: file.name,
      extension: file.extension,
      mimeType: file.mimeType,
      isEditable: isTextEditable,
      content,
      currentVersion: file.currentVersion,
      updatedAt: file.updatedAt.toISOString(),
    };
  }

  static async saveFileContent(fileId: string, userId: string, content: string) {
    const file = await FileRepository.findById(fileId);
    if (!file) throw new NotFoundError('File not found');

    // Save object to storage
    await StorageProvider.saveObject(file.storageKey, content, file.mimeType);

    const buffer = Buffer.from(content, 'utf-8');
    const newSizeBytes = BigInt(buffer.length);

    const updated = await FileRepository.update(fileId, {
      sizeBytes: newSizeBytes,
    });

    await ActivityRepository.log({
      roomId: file.roomId,
      userId,
      action: 'FILE_UPDATED',
      entityType: 'FILE',
      entityId: fileId,
      details: { name: file.name, autosave: true, newSizeBytes: buffer.length },
    });

    // Real-time broadcast to all members in the room
    broadcastToRoom(file.roomId, 'file:content_changed', {
      fileId: file.id,
      name: file.name,
      content,
      updatedBy: userId,
      updatedAt: updated.updatedAt.toISOString(),
    });

    broadcastToRoom(file.roomId, 'file:updated', {
      id: updated.id,
      name: updated.name,
      sizeBytes: updated.sizeBytes.toString(),
      currentVersion: updated.currentVersion,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return {
      id: updated.id,
      name: updated.name,
      sizeBytes: updated.sizeBytes.toString(),
      currentVersion: updated.currentVersion,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
