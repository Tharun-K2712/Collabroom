import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from './env';
import { prisma } from './db';
import path from 'path';
import fs from 'fs';

export const s3Client = new S3Client({
  region: ENV.AWS.REGION,
  credentials: {
    accessKeyId: ENV.AWS.ACCESS_KEY_ID || 'mock-key',
    secretAccessKey: ENV.AWS.SECRET_ACCESS_KEY || 'mock-secret',
  },
});

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class StorageProvider {
  static isS3Enabled(): boolean {
    const hasCreds = Boolean(
      ENV.AWS.ACCESS_KEY_ID &&
      ENV.AWS.SECRET_ACCESS_KEY &&
      ENV.AWS.BUCKET_NAME &&
      ENV.AWS.ACCESS_KEY_ID !== 'mock-key' &&
      !ENV.AWS.ACCESS_KEY_ID.includes('mock')
    );
    if (!hasCreds) return false;
    // Prefer S3 if credentials are provided
    if (process.env.STORAGE_PROVIDER === 's3') return true;
    if (process.env.STORAGE_PROVIDER === 'local' && !process.env.AWS_ACCESS_KEY_ID) {
      return false;
    }
    return hasCreds;
  }

  static getBaseHost(): string {
    if (process.env.RENDER_EXTERNAL_URL) {
      return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
    }
    if (process.env.API_URL) {
      return process.env.API_URL.replace(/\/api\/?$/, '');
    }
    return '';
  }

  static async generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds: number = 3600
  ): Promise<{ uploadUrl: string; storageKey: string; isS3: boolean }> {
    if (this.isS3Enabled()) {
      const command = new PutObjectCommand({
        Bucket: ENV.AWS.BUCKET_NAME,
        Key: storageKey,
        ContentType: mimeType,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
      return { uploadUrl, storageKey, isS3: true };
    }

    // Local signed URL endpoint
    const baseHost = this.getBaseHost();
    const uploadUrl = `${baseHost}/api/storage/local-upload?key=${encodeURIComponent(storageKey)}`;
    return { uploadUrl, storageKey, isS3: false };
  }

  static async generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    if (this.isS3Enabled()) {
      const ext = path.extname(originalName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      const command = new GetObjectCommand({
        Bucket: ENV.AWS.BUCKET_NAME,
        Key: storageKey,
        ResponseContentType: contentType,
        ResponseContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    }

    // Local download endpoint with temporary signed token
    const baseHost = this.getBaseHost();
    return `${baseHost}/api/storage/local-download?key=${encodeURIComponent(storageKey)}&filename=${encodeURIComponent(originalName)}`;
  }

  static async readObject(storageKey: string): Promise<string> {
    if (this.isS3Enabled()) {
      try {
        const command = new GetObjectCommand({
          Bucket: ENV.AWS.BUCKET_NAME,
          Key: storageKey,
        });
        const response = await s3Client.send(command);
        return (await response.Body?.transformToString('utf-8')) || '';
      } catch (err: any) {
        console.warn(`S3 readObject fallback to local for ${storageKey}:`, err.message);
      }
    }

    const local = await this.getLocalFile(storageKey);
    if (local && local.buffer) {
      return local.buffer.toString('utf-8');
    }
    return '';
  }

  static async saveObject(storageKey: string, content: string, mimeType: string = 'text/plain'): Promise<void> {
    const buffer = Buffer.from(content, 'utf-8');
    if (this.isS3Enabled()) {
      const command = new PutObjectCommand({
        Bucket: ENV.AWS.BUCKET_NAME,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      });
      await s3Client.send(command);
    }
    await this.saveLocalFile(storageKey, buffer, mimeType);
  }

  static async saveLocalFile(storageKey: string, fileBuffer: Buffer, mimeType?: string): Promise<string> {
    const localFilePath = path.join(UPLOADS_DIR, storageKey);
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, fileBuffer);

    // 1. Persist to Neon Postgres so files survive Render instance restarts & redeploys
    try {
      await (prisma as any).fileBlob?.upsert({
        where: { storageKey },
        update: {
          data: fileBuffer,
          mimeType: mimeType || null,
          sizeBytes: BigInt(fileBuffer.length),
        },
        create: {
          storageKey,
          data: fileBuffer,
          mimeType: mimeType || null,
          sizeBytes: BigInt(fileBuffer.length),
        },
      });
    } catch (err) {
      console.warn('Could not persist file blob to database fallback:', err);
    }

    // 2. Mirror to S3 if credentials exist
    if (this.isS3Enabled()) {
      try {
        const command = new PutObjectCommand({
          Bucket: ENV.AWS.BUCKET_NAME,
          Key: storageKey,
          Body: fileBuffer,
          ContentType: mimeType || 'application/octet-stream',
        });
        await s3Client.send(command);
      } catch (err: any) {
        console.warn(`Could not mirror file ${storageKey} to S3:`, err.message);
      }
    }

    return localFilePath;
  }

  static async getLocalFile(storageKey: string): Promise<{ buffer: Buffer; mimeType?: string } | null> {
    const localFilePath = path.join(UPLOADS_DIR, storageKey);

    // 1. Check disk cache
    if (fs.existsSync(localFilePath)) {
      try {
        const buffer = fs.readFileSync(localFilePath);
        return { buffer };
      } catch (err) {
        console.warn(`Error reading disk cache for ${storageKey}:`, err);
      }
    }

    // 2. Fetch from Neon Postgres
    try {
      const blob = await (prisma as any).fileBlob?.findUnique({
        where: { storageKey },
      });
      if (blob && blob.data) {
        const buffer = Buffer.from(blob.data);
        // Cache back to disk
        try {
          const dir = path.dirname(localFilePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(localFilePath, buffer);
        } catch {}
        return { buffer, mimeType: blob.mimeType || undefined };
      }
    } catch (err) {
      console.error('Error fetching file blob from database:', err);
    }

    // 3. Check AWS S3
    if (this.isS3Enabled()) {
      try {
        const command = new GetObjectCommand({
          Bucket: ENV.AWS.BUCKET_NAME,
          Key: storageKey,
        });
        const response = await s3Client.send(command);
        if (response.Body) {
          const bytes = await response.Body.transformToByteArray();
          const buffer = Buffer.from(bytes);
          // Cache to disk and database
          try {
            const dir = path.dirname(localFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localFilePath, buffer);
          } catch {}
          try {
            await (prisma as any).fileBlob?.upsert({
              where: { storageKey },
              update: {
                data: buffer,
                mimeType: response.ContentType || null,
                sizeBytes: BigInt(buffer.length),
              },
              create: {
                storageKey,
                data: buffer,
                mimeType: response.ContentType || null,
                sizeBytes: BigInt(buffer.length),
              },
            });
          } catch {}
          return { buffer, mimeType: response.ContentType || undefined };
        }
      } catch (err: any) {
        if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
          console.warn(`S3 fallback error for ${storageKey}:`, err.message);
        }
      }
    }

    return null;
  }

  static async deleteObject(storageKey: string): Promise<void> {
    if (this.isS3Enabled()) {
      const command = new DeleteObjectCommand({
        Bucket: ENV.AWS.BUCKET_NAME,
        Key: storageKey,
      });
      await s3Client.send(command);
    } else {
      const localFilePath = path.join(UPLOADS_DIR, storageKey);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch {}
      }
      try {
        await (prisma as any).fileBlob?.delete({
          where: { storageKey },
        }).catch(() => {});
      } catch {}
    }
  }
}
