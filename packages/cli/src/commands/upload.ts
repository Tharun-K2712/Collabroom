import fs from 'fs';
import path from 'path';
import { ApiClient } from '../client';
import { ConfigManager } from '../config';

interface FileToUpload {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  sizeBytes: number;
}

function getAllFiles(dir: string, baseDir: string): FileToUpload[] {
  let results: FileToUpload[] = [];
  const list = fs.readdirSync(dir);

  for (const item of list) {
    if (item === '.git' || item === 'node_modules' || item === '.collabroom.json') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({
        absolutePath: fullPath,
        relativePath: relPath,
        fileName: item,
        sizeBytes: stat.size,
      });
    }
  }

  return results;
}

export async function uploadCommand(roomId: string, localPathArg: string) {
  if (!roomId || !localPathArg) {
    console.error('❌ Usage: collabroom upload <roomId> <fileOrFolderPath>');
    return;
  }

  const config = ConfigManager.getConfig();
  if (!config.token) {
    console.error('❌ You must be signed in to upload. Run: collabroom login');
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), localPathArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Path not found: ${resolvedPath}`);
    return;
  }

  const stat = fs.statSync(resolvedPath);
  const isDirectory = stat.isDirectory();

  try {
    const roomRes = await ApiClient.getRoomDetails(roomId);
    if (!roomRes.success || !roomRes.data) {
      console.error(`❌ Could not access room: ${roomRes.message}`);
      return;
    }

    const room = roomRes.data;
    console.log(`\n================================================================`);
    console.log(`  🚀 CollabRoom ${isDirectory ? 'Folder' : 'File'} Upload`);
    console.log(`  Target Workspace: \x1b[32m${room.name}\x1b[0m (ID: ${roomId})`);
    console.log(`  Source: \x1b[33m${resolvedPath}\x1b[0m`);
    console.log(`================================================================\n`);

    const filesToUpload: FileToUpload[] = isDirectory
      ? getAllFiles(resolvedPath, resolvedPath)
      : [
          {
            absolutePath: resolvedPath,
            relativePath: path.basename(resolvedPath),
            fileName: path.basename(resolvedPath),
            sizeBytes: stat.size,
          },
        ];

    if (filesToUpload.length === 0) {
      console.log('ℹ️ No files found to upload.');
      return;
    }

    console.log(`📦 Found ${filesToUpload.length} document${filesToUpload.length > 1 ? 's' : ''} to upload...\n`);

    const folderCache: Record<string, string | null> = {};

    // Collect all unique directories and resolve hierarchy upfront
    const uniquePaths = new Set<string>();
    for (const file of filesToUpload) {
      const parts = file.relativePath.split('/');
      if (parts.length > 1) {
        const folderParts = parts.slice(0, -1);
        for (let i = 1; i <= folderParts.length; i++) {
          uniquePaths.add(folderParts.slice(0, i).join('/'));
        }
      }
    }

    const sortedPaths = Array.from(uniquePaths).sort((a, b) => a.split('/').length - b.split('/').length);
    if (sortedPaths.length > 0) {
      process.stdout.write(`📁 Preparing folder structures (${sortedPaths.length} directories)... `);
      for (const p of sortedPaths) {
        const parts = p.split('/');
        const dirName = parts[parts.length - 1];
        const parentKey = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
        const parentFolderId = parentKey ? folderCache[parentKey] ?? null : null;

        const query = parentFolderId ? `?parentId=${parentFolderId}` : '';
        const foldersRes: any = await ApiClient.request(`/rooms/${roomId}/folders${query}`);
        const existing: any = foldersRes.data?.find((f: any) => f.name.toLowerCase() === dirName.toLowerCase());

        if (existing) {
          folderCache[p] = existing.id;
        } else {
          const createRes: any = await ApiClient.request(`/rooms/${roomId}/folders`, {
            method: 'POST',
            body: JSON.stringify({ name: dirName, parentId: parentFolderId }),
          });
          if (createRes.success && createRes.data) {
            folderCache[p] = createRes.data.id;
          }
        }
      }
      console.log(`\x1b[32mOK\x1b[0m`);
    }

    let uploaded = 0;
    let queueIndex = 0;
    const PARALLEL_CONCURRENCY = 4;

    async function uploadWorker() {
      while (queueIndex < filesToUpload.length) {
        const currentIndex = queueIndex++;
        const file = filesToUpload[currentIndex];

        let targetFolderId: string | null = null;
        const parts = file.relativePath.split('/');
        if (parts.length > 1) {
          const folderKey = parts.slice(0, -1).join('/');
          targetFolderId = folderCache[folderKey] || null;
        }

        // 1. Request upload URL
        const urlRes = await ApiClient.request(`/rooms/${roomId}/files/upload-url`, {
          method: 'POST',
          body: JSON.stringify({
            name: file.fileName,
            originalName: file.fileName,
            mimeType: 'application/octet-stream',
            sizeBytes: file.sizeBytes,
            folderId: targetFolderId,
          }),
        });

        const { uploadUrl, storageKey, isSupabase, isS3 } = urlRes.data;
        const fileBuffer = fs.readFileSync(file.absolutePath);

        // 2. Upload binary
        const isDirectCloudUpload = isSupabase || isS3 || (!uploadUrl.includes('/api/storage/local-upload'));
        const uploadTarget = uploadUrl.startsWith('http')
          ? uploadUrl
          : `${ApiClient.getBaseUrl().replace(/\/api\/?$/, '')}${uploadUrl}`;

        let uploadBinaryRes: Response;
        if (isDirectCloudUpload && !uploadUrl.includes('/api/storage/local-upload')) {
          uploadBinaryRes = await fetch(uploadTarget, {
            method: 'PUT',
            body: fileBuffer,
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        } else {
          const formData = new FormData();
          const blob = new Blob([fileBuffer]);
          formData.append('file', blob, file.fileName);

          uploadBinaryRes = await fetch(uploadTarget, {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${config.token}`,
            },
          });
        }

        if (!uploadBinaryRes.ok) {
          throw new Error(`Upload payload failed for ${file.fileName} with HTTP ${uploadBinaryRes.status}`);
        }

        // 3. Finalize file record
        const ext = path.extname(file.fileName).replace('.', '').toLowerCase() || 'dat';
        await ApiClient.request(`/rooms/${roomId}/files`, {
          method: 'POST',
          body: JSON.stringify({
            name: file.fileName,
            originalName: file.fileName,
            mimeType: 'application/octet-stream',
            extension: ext,
            sizeBytes: file.sizeBytes,
            storageKey,
            folderId: targetFolderId,
          }),
        });

        uploaded++;
        console.log(`  [\x1b[32m${uploaded}/${filesToUpload.length}\x1b[0m] Uploaded ${file.relativePath}`);
      }
    }

    const workerCount = Math.min(PARALLEL_CONCURRENCY, filesToUpload.length);
    await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));

    console.log(`\n🎉 \x1b[32mUpload Complete!\x1b[0m Successfully uploaded ${uploaded} file(s) into "${room.name}".\n`);
  } catch (err: any) {
    console.error(`\n❌ Upload failed: ${err.message}\n`);
  }
}
