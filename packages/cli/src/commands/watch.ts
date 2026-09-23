import fs from 'fs';
import path from 'path';
import { io, Socket } from 'socket.io-client';
import { ApiClient } from '../client';
import { ConfigManager } from '../config';
import { RoomManifest } from './pull';

export async function syncCommand(roomId: string, dirArg?: string) {
  if (!roomId) {
    console.error('❌ Room ID is required. Example: collabroom sync <roomId> [folderPath]');
    return;
  }

  const config = ConfigManager.getConfig();
  if (!config.token || !config.user) {
    console.error('❌ You must be logged in to sync. Run: collabroom login');
    return;
  }

  try {
    const roomRes = await ApiClient.getRoomDetails(roomId);
    if (!roomRes.success || !roomRes.data) {
      console.error(`❌ Could not join room: ${roomRes.message}`);
      return;
    }

    const room = roomRes.data;
    const targetDir = path.resolve(process.cwd(), dirArg || room.name.replace(/[^a-zA-Z0-9-_]/g, '_'));

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\n================================================================`);
    console.log(`  🚀 CollabRoom Live Sync Engine Started`);
    console.log(`  Room: \x1b[32m${room.name}\x1b[0m (ID: ${roomId})`);
    console.log(`  User: \x1b[36m${config.user.fullName}\x1b[0m (${room.currentUserRole || 'MEMBER'})`);
    console.log(`  Folder: \x1b[33m${targetDir}\x1b[0m`);
    console.log(`================================================================\n`);
    console.log(`🔄 Performing initial document pull...`);

    // 1. Initial pull to ensure directory is in sync
    const filesRes = await ApiClient.listFiles(roomId);
    const files = filesRes.data || [];

    const fileMap: Record<string, { id: string; name: string; version: number }> = {};
    const idToNameMap: Record<string, string> = {};

    for (const f of files) {
      try {
        const contentRes = await ApiClient.getFileContent(f.id);
        const content = contentRes.data?.content !== undefined ? contentRes.data.content : '';
        const filePath = path.join(targetDir, f.name);

        fs.writeFileSync(filePath, content, 'utf-8');
        fileMap[f.name] = { id: f.id, name: f.name, version: f.currentVersion };
        idToNameMap[f.id] = f.name;
        console.log(`  📄 Synced: ${f.name} (v${f.currentVersion})`);
      } catch (err: any) {
        console.warn(`  ⚠️ Skipped ${f.name}: ${err.message}`);
      }
    }

    // Save manifest
    const manifest: RoomManifest = {
      roomId,
      roomName: room.name,
      lastSyncedAt: new Date().toISOString(),
      files: Object.fromEntries(
        Object.entries(fileMap).map(([name, item]) => [
          name,
          { fileId: item.id, fileName: item.name, version: item.version, updatedAt: new Date().toISOString() },
        ])
      ),
    };
    fs.writeFileSync(path.join(targetDir, '.collabroom.json'), JSON.stringify(manifest, null, 2));

    // 2. Connect to Socket.IO Server for live real-time synchronization
    const serverUrl = config.apiUrl.replace(/\/api\/?$/, '');
    console.log(`\n🌐 Connecting to CollabRoom Real-Time WebSocket at ${serverUrl}...`);

    const socket: Socket = io(serverUrl, {
      auth: { token: config.token },
      transports: ['websocket', 'polling'],
    });

    let isUpdatingLocally = false;

    socket.on('connect', () => {
      console.log(`⚡ Connected to live server! Joining room channel: room:${roomId}`);
      socket.emit('room:join', roomId);
      console.log(`\n🟢 [LIVE READY] Any changes made in CMD or in Web Browser will sync instantly.`);
      console.log(`👉 Edit documents in \x1b[33m${targetDir}\x1b[0m using any text editor, VS Code, or Notepad.\n`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`⚠️ Socket connection issue: ${err.message}. Retrying...`);
    });

    // Handle Incoming Live File Edits from other users
    socket.on('file:content_changed', (data: { fileId: string; name: string; content: string; updatedBy: string }) => {
      // If the change came from another user, apply it locally
      if (data.updatedBy !== config.user?.id) {
        const fileName = idToNameMap[data.fileId] || data.name;
        const filePath = path.join(targetDir, fileName);

        console.log(`\n📥 [LIVE SYNC] Remote edit received for "\x1b[32m${fileName}\x1b[0m" — updating local file...`);

        isUpdatingLocally = true;
        try {
          fs.writeFileSync(filePath, data.content, 'utf-8');
          console.log(`✨ Successfully synchronized \x1b[32m${fileName}\x1b[0m on your disk.`);
        } catch (err: any) {
          console.error(`❌ Failed to write local sync: ${err.message}`);
        } finally {
          setTimeout(() => {
            isUpdatingLocally = false;
          }, 300);
        }
      }
    });

    // Handle incoming new files
    socket.on('file:uploaded', (data: { file: any; uploadedBy: string }) => {
      if (data.file && data.file.roomId === roomId) {
        console.log(`\n📢 [NEW FILE] Host uploaded new document: \x1b[36m${data.file.name}\x1b[0m`);
        fileMap[data.file.name] = { id: data.file.id, name: data.file.name, version: data.file.currentVersion };
        idToNameMap[data.file.id] = data.file.name;

        ApiClient.getFileContent(data.file.id).then((res) => {
          if (res.success && res.data) {
            isUpdatingLocally = true;
            fs.writeFileSync(path.join(targetDir, data.file.name), res.data.content || '', 'utf-8');
            setTimeout(() => {
              isUpdatingLocally = false;
            }, 300);
            console.log(`📥 Downloaded new file: ${data.file.name}`);
          }
        }).catch(() => {});
      }
    });

    // Handle file deletions
    socket.on('file:deleted', (data: { fileId: string }) => {
      const fileName = idToNameMap[data.fileId];
      if (fileName) {
        console.log(`\n🗑️ [FILE REMOVED] Document "\x1b[31m${fileName}\x1b[0m" was deleted.`);
      }
    });

    // 3. Watch local directory for file modifications
    const debounceTimers: Record<string, NodeJS.Timeout> = {};

    fs.watch(targetDir, (eventType, filename) => {
      if (!filename || filename === '.collabroom.json' || isUpdatingLocally) {
        return;
      }

      if (debounceTimers[filename]) {
        clearTimeout(debounceTimers[filename]);
      }

      debounceTimers[filename] = setTimeout(async () => {
        const filePath = path.join(targetDir, filename);
        if (!fs.existsSync(filePath)) return;

        const fileInfo = fileMap[filename];
        if (!fileInfo) {
          return;
        }

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          console.log(`\n📤 [LOCAL EDIT] Detected edit in "\x1b[32m${filename}\x1b[0m" — broadcasting to room...`);

          const res = await ApiClient.saveFileContent(fileInfo.id, content);
          if (res.success) {
            console.log(`✅ [BROADCAST SUCCESS] "${filename}" updated and synced to all participants!`);
          } else {
            console.error(`❌ Sync error: ${res.message}`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to push edit: ${err.message}`);
        }
      }, 500); // 500ms debounce
    });

    // Graceful exit
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping live synchronization...');
      socket.disconnect();
      process.exit(0);
    });

  } catch (err: any) {
    console.error(`❌ Error in sync engine: ${err.message}`);
  }
}
