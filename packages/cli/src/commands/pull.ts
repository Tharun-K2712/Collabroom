import fs from 'fs';
import path from 'path';
import { ApiClient } from '../client';

export interface RoomManifest {
  roomId: string;
  roomName: string;
  lastSyncedAt: string;
  files: Record<string, {
    fileId: string;
    fileName: string;
    version: number;
    updatedAt: string;
  }>;
}

export async function pullCommand(roomId: string, targetDirArg?: string) {
  if (!roomId) {
    console.error('❌ Room ID is required. Example: collabroom pull <roomId> [folder]');
    return;
  }

  try {
    const roomRes = await ApiClient.getRoomDetails(roomId);
    if (!roomRes.success || !roomRes.data) {
      console.error(`❌ Could not find room: ${roomRes.message}`);
      return;
    }

    const room = roomRes.data;
    const targetDir = path.resolve(process.cwd(), targetDirArg || room.name.replace(/[^a-zA-Z0-9-_]/g, '_'));

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\n📥 Pulling documents from room "\x1b[32m${room.name}\x1b[0m" into \x1b[36m${targetDir}\x1b[0m...\n`);

    const filesRes = await ApiClient.listFiles(roomId);
    const files = filesRes.data || [];

    const manifest: RoomManifest = {
      roomId,
      roomName: room.name,
      lastSyncedAt: new Date().toISOString(),
      files: {},
    };

    let pulledCount = 0;

    for (const f of files) {
      try {
        const contentRes = await ApiClient.getFileContent(f.id);
        const content = contentRes.data?.content !== undefined ? contentRes.data.content : '';
        const filePath = path.join(targetDir, f.name);

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`  ✅ Downloaded: ${f.name} (v${f.currentVersion})`);

        manifest.files[f.name] = {
          fileId: f.id,
          fileName: f.name,
          version: f.currentVersion,
          updatedAt: f.updatedAt,
        };
        pulledCount++;
      } catch (err: any) {
        console.warn(`  ⚠️ Skipped ${f.name}: ${err.message}`);
      }
    }

    // Save manifest file
    fs.writeFileSync(path.join(targetDir, '.collabroom.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n🎉 Successfully pulled ${pulledCount} documents.`);
    console.log(`👉 To start live-editing with instant sync, run:`);
    console.log(`   \x1b[36mcollabroom sync ${roomId} "${targetDir}"\x1b[0m\n`);
  } catch (err: any) {
    console.error(`❌ Error pulling files: ${err.message}`);
  }
}

export async function pushCommand(filePathArg: string, fileIdArg?: string) {
  if (!filePathArg) {
    console.error('❌ File path is required. Example: collabroom push <filePath> [fileId]');
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), filePathArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found at: ${resolvedPath}`);
    return;
  }

  let fileId = fileIdArg;

  // Try to find fileId from manifest if not passed
  if (!fileId) {
    const dir = path.dirname(resolvedPath);
    const manifestPath = path.join(dir, '.collabroom.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest: RoomManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const fileName = path.basename(resolvedPath);
        if (manifest.files[fileName]) {
          fileId = manifest.files[fileName].fileId;
        }
      } catch {}
    }
  }

  if (!fileId) {
    console.error('❌ Could not determine File ID. Please specify it: collabroom push <filePath> <fileId>');
    return;
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    console.log(`🔄 Pushing update for file \x1b[36m${path.basename(resolvedPath)}\x1b[0m (ID: ${fileId})...`);

    const res = await ApiClient.saveFileContent(fileId, content);
    if (res.success) {
      console.log(`\n✅ File saved and synced to everyone in the room! (Version ${res.data?.currentVersion || 1})\n`);
    } else {
      console.error(`❌ Push failed: ${res.message}`);
    }
  } catch (err: any) {
    console.error(`❌ Error pushing file: ${err.message}`);
  }
}
