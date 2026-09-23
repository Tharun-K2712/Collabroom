import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { ApiClient } from '../client';
import { ConfigManager } from '../config';
import { syncCommand } from './watch';

export async function openCommand(roomId: string, targetArg?: string) {
  if (!roomId) {
    console.error('❌ Room ID is required. Example: collabroom open <roomId> [fileIdOrName]');
    return;
  }

  const config = ConfigManager.getConfig();
  if (!config.token || !config.user) {
    console.error('❌ You must be logged in. Run: collabroom login');
    return;
  }

  try {
    const roomRes = await ApiClient.getRoomDetails(roomId);
    if (!roomRes.success || !roomRes.data) {
      console.error(`❌ Could not access room: ${roomRes.message}`);
      return;
    }

    const room = roomRes.data;
    const targetDir = path.resolve(process.cwd(), room.name.replace(/[^a-zA-Z0-9-_]/g, '_'));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filesRes = await ApiClient.listFiles(roomId);
    const files = filesRes.data || [];

    if (files.length === 0) {
      console.log(`ℹ️ Room "${room.name}" has no documents yet.`);
      return;
    }

    let targetFile = files[0];
    if (targetArg) {
      const matched = files.find(
        (f: any) =>
          f.id === targetArg ||
          f.name.toLowerCase() === targetArg.toLowerCase() ||
          f.originalName.toLowerCase() === targetArg.toLowerCase()
      );
      if (matched) {
        targetFile = matched;
      }
    }

    console.log(`\n================================================================`);
    console.log(`  🚀 CollabRoom Native App Launcher & Cloud Sync`);
    console.log(`  Workspace: \x1b[32m${room.name}\x1b[0m (ID: ${roomId})`);
    console.log(`  Document:  \x1b[33m${targetFile.name}\x1b[0m (v${targetFile.currentVersion})`);
    console.log(`  User:      \x1b[36m${config.user.fullName}\x1b[0m (${room.currentUserRole || 'EDITOR'})`);
    console.log(`================================================================\n`);

    // Download content
    const contentRes = await ApiClient.getFileContent(targetFile.id);
    const filePath = path.join(targetDir, targetFile.name);
    fs.writeFileSync(filePath, contentRes.data?.content || '', 'utf-8');

    // Launch in default OS application
    const platform = process.platform;
    let openCmd = '';
    if (platform === 'win32') {
      openCmd = `start "" "${filePath}"`;
    } else if (platform === 'darwin') {
      openCmd = `open "${filePath}"`;
    } else {
      openCmd = `xdg-open "${filePath}"`;
    }

    console.log(`📂 Launching document in your system's default application...`);
    exec(openCmd, (err) => {
      if (err) {
        console.warn(`⚠️ Note: Could not auto-launch app (${err.message}). You can open "${filePath}" manually.`);
      } else {
        console.log(`✨ Opened in application successfully.`);
      }
    });

    console.log(`\n🔄 Starting Real-Time Cloud Auto-Save Engine...`);
    console.log(`💡 Whenever you make edits and press Save (Ctrl+S) in your application, changes are automatically pushed to the cloud!\n`);

    // Start background live sync on this directory
    await syncCommand(roomId, targetDir);
  } catch (err: any) {
    console.error(`❌ Error opening document: ${err.message}`);
  }
}
