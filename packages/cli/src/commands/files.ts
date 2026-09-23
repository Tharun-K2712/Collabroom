import { ApiClient } from '../client';

export async function filesCommand(roomId: string) {
  if (!roomId) {
    console.error('❌ Room ID is required. Example: collabroom files <roomId>');
    return;
  }

  try {
    console.log(`\n📄 Fetching documents for room \x1b[36m${roomId}\x1b[0m...\n`);
    const res = await ApiClient.listFiles(roomId);

    if (!res.success || !res.data || res.data.length === 0) {
      console.log('ℹ️ No files found in this room.');
      return;
    }

    console.log('┌───────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  FILE ID                               │ NAME                     │ SIZE       │ REV  │');
    console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');

    for (const f of res.data) {
      const id = f.id.padEnd(36, ' ');
      const name = (f.name.length > 24 ? f.name.slice(0, 21) + '...' : f.name).padEnd(24, ' ');
      const bytes = parseInt(f.sizeBytes, 10) || 0;
      const sizeStr = (bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`).padStart(10, ' ');
      const rev = `v${f.currentVersion || 1}`.padEnd(4, ' ');
      console.log(`│  ${id} │ ${name} │ ${sizeStr} │ ${rev} │`);
    }

    console.log('└───────────────────────────────────────────────────────────────────────────────────────┘\n');
  } catch (err: any) {
    console.error(`❌ Error listing files: ${err.message}`);
  }
}

export async function catCommand(fileId: string) {
  if (!fileId) {
    console.error('❌ File ID is required. Example: collabroom cat <fileId>');
    return;
  }

  try {
    const res = await ApiClient.getFileContent(fileId);
    if (res.success && res.data) {
      process.stdout.write(res.data.content || '');
    } else {
      console.error(`❌ Could not retrieve file content: ${res.message}`);
    }
  } catch (err: any) {
    console.error(`❌ Error fetching file: ${err.message}`);
  }
}
