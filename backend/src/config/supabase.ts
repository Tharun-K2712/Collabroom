import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';
import { prisma } from './db';
import path from 'path';
import fs from 'fs';

// Supabase client instance initialized with project URL and key
export const supabaseClient: SupabaseClient = createClient(
  ENV.SUPABASE.URL,
  ENV.SUPABASE.SERVICE_ROLE_KEY || ENV.SUPABASE.KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class StorageProvider {
  static getBucketName(): string {
    return ENV.SUPABASE.BUCKET_NAME || 'collabroom-files';
  }

  static isSupabaseConfigured(): boolean {
    return Boolean(
      ENV.SUPABASE.URL &&
      ENV.SUPABASE.KEY &&
      ENV.SUPABASE.URL.includes('supabase.co')
    );
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

  /**
   * Generates upload destination:
   * 1. Attempts Supabase Storage signed upload URL
   * 2. If RLS on bucket requires service role or custom policy, uses server upload proxy
   */
  static async generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds: number = 3600
  ): Promise<{ uploadUrl: string; storageKey: string; isSupabase: boolean }> {
    const bucket = this.getBucketName();

    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .createSignedUploadUrl(storageKey);

        if (!error && data?.signedUrl) {
          const fullUploadUrl = data.signedUrl.startsWith('http')
            ? data.signedUrl
            : `${ENV.SUPABASE.URL}/storage/v1${data.signedUrl}`;

          return {
            uploadUrl: fullUploadUrl,
            storageKey,
            isSupabase: true,
          };
        }
      } catch (err: any) {
        console.warn(`Supabase createSignedUploadUrl fallback for ${storageKey}:`, err?.message || err);
      }
    }

    // Server-managed upload endpoint (streams directly into Supabase Storage & Neon)
    const baseHost = this.getBaseHost();
    const uploadUrl = `${baseHost}/api/storage/local-upload?key=${encodeURIComponent(storageKey)}`;
    return { uploadUrl, storageKey, isSupabase: false };
  }

  /**
   * Generates secure temporary signed download URL for private files
   */
  static async generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const bucket = this.getBucketName();

    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .createSignedUrl(storageKey, expiresInSeconds, {
            download: originalName,
          });

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err: any) {
        console.warn(`Supabase createSignedUrl fallback for ${storageKey}:`, err?.message || err);
      }
    }

    // Fallback to server streaming endpoint
    const baseHost = this.getBaseHost();
    return `${baseHost}/api/storage/local-download?key=${encodeURIComponent(storageKey)}&filename=${encodeURIComponent(originalName)}`;
  }

  /**
   * Reads raw file content (e.g., text editor preview)
   */
  static async readObject(storageKey: string): Promise<string> {
    const bucket = this.getBucketName();

    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).download(storageKey);
        if (!error && data) {
          return await data.text();
        }
      } catch (err: any) {
        console.warn(`Supabase readObject fallback for ${storageKey}:`, err?.message || err);
      }
    }

    const local = await this.getLocalFile(storageKey);
    if (local && local.buffer) {
      return local.buffer.toString('utf-8');
    }
    return '';
  }

  /**
   * Saves text document updates directly
   */
  static async saveObject(storageKey: string, content: string, mimeType: string = 'text/plain'): Promise<void> {
    const buffer = Buffer.from(content, 'utf-8');
    const bucket = this.getBucketName();

    if (this.isSupabaseConfigured()) {
      try {
        await supabaseClient.storage.from(bucket).upload(storageKey, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      } catch (err: any) {
        console.warn(`Supabase saveObject fallback for ${storageKey}:`, err?.message || err);
      }
    }

    await this.saveLocalFile(storageKey, buffer, mimeType);
  }

  /**
   * Saves file binary to disk cache, Neon database, and Supabase Storage
   */
  static async saveLocalFile(storageKey: string, fileBuffer: Buffer, mimeType?: string): Promise<string> {
    const localFilePath = path.join(UPLOADS_DIR, storageKey);
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, fileBuffer);

    // 1. Upload to Supabase Storage bucket
    const bucket = this.getBucketName();
    if (this.isSupabaseConfigured()) {
      try {
        await supabaseClient.storage.from(bucket).upload(storageKey, fileBuffer, {
          contentType: mimeType || 'application/octet-stream',
          upsert: true,
        });
      } catch (err: any) {
        console.warn(`Supabase Storage upload warning for ${storageKey}:`, err?.message || err);
      }
    }

    // 2. Persist to Neon Postgres so files survive instance restarts
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
      console.warn('Could not persist file blob to Neon database:', err);
    }

    return localFilePath;
  }

  /**
   * Retrieves file buffer from disk, Supabase Storage, or Neon Postgres
   */
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

    // 2. Check Supabase Storage
    const bucket = this.getBucketName();
    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).download(storageKey);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Cache to disk
          try {
            const dir = path.dirname(localFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localFilePath, buffer);
          } catch {}

          return { buffer, mimeType: data.type || undefined };
        }
      } catch (err: any) {
        console.warn(`Supabase download check error for ${storageKey}:`, err?.message || err);
      }
    }

    // 3. Check Neon Postgres
    try {
      const blob = await (prisma as any).fileBlob?.findUnique({
        where: { storageKey },
      });
      if (blob && blob.data) {
        const buffer = Buffer.from(blob.data);
        try {
          const dir = path.dirname(localFilePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(localFilePath, buffer);
        } catch {}
        return { buffer, mimeType: blob.mimeType || undefined };
      }
    } catch (err) {
      console.error('Error fetching file blob from Neon database:', err);
    }

    return null;
  }

  /**
   * Deletes file from Supabase Storage, Neon Postgres, and disk cache
   */
  static async deleteObject(storageKey: string): Promise<void> {
    const bucket = this.getBucketName();

    if (this.isSupabaseConfigured()) {
      try {
        await supabaseClient.storage.from(bucket).remove([storageKey]);
      } catch (err: any) {
        console.warn(`Supabase delete warning for ${storageKey}:`, err?.message || err);
      }
    }

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
