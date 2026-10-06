import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/file.service';
import { FolderService } from '../services/folder.service';
import { StorageService } from '../services/storage.service';
import { sendSuccess, sendCreated } from '../utils/response';
import fs from 'fs';
import path from 'path';

export class FileController {
  static async requestUploadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const result = await FileService.requestUploadUrl(roomId, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async completeUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const file = await FileService.completeUpload(roomId, req.user!.id, req.body);
      return sendCreated(res, file, 'File uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const folderId = req.query.folderId !== undefined ? (req.query.folderId as string) || null : undefined;
      const isTrash = req.query.isTrash === 'true';
      const search = req.query.search as string;
      const extension = req.query.extension as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await FileService.listFiles(roomId, req.user!.id, {
        folderId,
        isTrash,
        search,
        extension,
        page,
        limit,
      });

      return sendSuccess(res, result.files, undefined, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFileDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const file = await FileService.getFileDetails(fileId);
      return sendSuccess(res, file);
    } catch (error) {
      next(error);
    }
  }

  static async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
      const result = await FileService.getDownloadUrl(fileId, req.user!.id, version);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async updateFile(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const updated = await FileService.updateFile(fileId, req.user!.id, req.body);
      return sendSuccess(res, updated, 'File updated');
    } catch (error) {
      next(error);
    }
  }

  static async createNewVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const version = await FileService.createNewVersion(fileId, req.user!.id, req.body);
      return sendCreated(res, version, 'New version uploaded');
    } catch (error) {
      next(error);
    }
  }

  static async restoreVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const versionNumber = parseInt(req.params.versionNumber as string, 10);
      const result = await FileService.restoreVersion(fileId, versionNumber, req.user!.id);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getFileContent(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const data = await FileService.getFileContent(fileId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async saveFileContent(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const { content } = req.body;
      const updated = await FileService.saveFileContent(fileId, req.user!.id, content ?? '');
      return sendSuccess(res, updated, 'File content saved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deletePermanently(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;
      const result = await FileService.deletePermanently(fileId, req.user!.id);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export class FolderController {
  static async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const folder = await FolderService.createFolder(roomId, req.user!.id, req.body);
      return sendCreated(res, folder, 'Folder created');
    } catch (error) {
      next(error);
    }
  }

  static async listFolders(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      const parentId = req.query.parentId !== undefined ? (req.query.parentId as string) || null : undefined;
      const folders = await FolderService.listFolders(roomId, parentId);
      return sendSuccess(res, folders);
    } catch (error) {
      next(error);
    }
  }

  static async updateFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const folderId = req.params.folderId as string;
      const updated = await FolderService.updateFolder(folderId, req.user!.id, req.body);
      return sendSuccess(res, updated, 'Folder updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteFolderPermanently(req: Request, res: Response, next: NextFunction) {
    try {
      const folderId = req.params.folderId as string;
      const result = await FolderService.deleteFolderPermanently(folderId, req.user!.id);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export class StorageController {
  static async handleLocalUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const storageKey = req.query.key as string;
      if (!storageKey) {
        return res.status(400).json({ success: false, message: 'Key required' });
      }

      const buffer = req.file ? req.file.buffer : (Buffer.isBuffer(req.body) ? req.body : null);
      if (!buffer) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      await StorageService.saveLocalFile(storageKey, buffer, req.file?.mimetype);
      return res.status(200).json({ success: true, message: 'Uploaded successfully', storageKey });
    } catch (error) {
      next(error);
    }
  }

  static async handleLocalDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const storageKey = req.query.key as string;
      const filename = (req.query.filename as string) || 'download';
      if (!storageKey) {
        return res.status(400).send('Missing key');
      }

      const fileData = await StorageService.getLocalFileBuffer(storageKey);
      if (!fileData) {
        return res.status(404).send('File not found in storage');
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.csv': 'text/csv; charset=utf-8',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.zip': 'application/zip',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };

      const contentType = fileData.mimeType || mimeTypes[ext] || 'application/octet-stream';
      const isAttachment = req.query.download === 'true' || req.query.download === '1';
      const dispositionType = isAttachment ? 'attachment' : 'inline';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.removeHeader('X-Frame-Options');
      return res.send(fileData.buffer);
    } catch (error) {
      next(error);
    }
  }
}
