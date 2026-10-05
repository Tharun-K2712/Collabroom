import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { StorageProvider, UPLOADS_DIR } from '../config/s3';
import { BadRequestError } from '../utils/errors';
import { ENV } from '../config/env';

export class StorageService {
  static generateStorageKey(roomId: string, originalName: string): string {
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const cleanFileName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 50);
    const uniqueId = uuidv4();
    return `rooms/${roomId}/files/${uniqueId}_${cleanFileName}${ext ? `.${ext}` : ''}`;
  }

  static validateFile(originalName: string, sizeBytes: number, mimeType: string) {
    if (sizeBytes > ENV.UPLOAD.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError(`File size exceeds the limit of ${ENV.UPLOAD.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    if (ext && !ENV.UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestError(`File extension .${ext} is not allowed`);
    }

    return { ext };
  }

  static async getUploadUrl(roomId: string, originalName: string, mimeType: string, sizeBytes: number) {
    this.validateFile(originalName, sizeBytes, mimeType);
    const storageKey = this.generateStorageKey(roomId, originalName);
    return StorageProvider.generatePresignedUploadUrl(storageKey, mimeType, 3600);
  }

  static async getDownloadUrl(storageKey: string, originalName: string) {
    return StorageProvider.generatePresignedDownloadUrl(storageKey, originalName, 3600);
  }

  static async deleteFile(storageKey: string) {
    return StorageProvider.deleteObject(storageKey);
  }

  static saveLocalFile(storageKey: string, fileBuffer: Buffer) {
    const fullPath = path.join(UPLOADS_DIR, storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, fileBuffer);
    return fullPath;
  }

  static getLocalFilePath(storageKey: string): string | null {
    const fullPath = path.join(UPLOADS_DIR, storageKey);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }
}
