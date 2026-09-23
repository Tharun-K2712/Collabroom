import { ApiClient } from '../client';

export async function roomsCommand() {
  try {
    console.log('\n📂 Fetching your CollabRoom workspaces...\n');
    const res = await ApiClient.listRooms();

    if (!res.success || !res.data || res.data.length === 0) {
      console.log('ℹ️ No rooms found. Create or get invited to a room first.');
      return;
    }

    console.log('┌───────────────────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  ROOM ID                               │ NAME                     │ ROLE    │ FILES │ MEMBERS │');
    console.log('├───────────────────────────────────────────────────────────────────────────────────────────────────┤');

    for (const room of res.data) {
      const id = room.id.padEnd(36, ' ');
      const name = (room.name.length > 24 ? room.name.slice(0, 21) + '...' : room.name).padEnd(24, ' ');
      const role = (room.currentUserRole || 'MEMBER').padEnd(7, ' ');
      const files = String(room.fileCount || 0).padStart(5, ' ');
      const members = String(room.memberCount || 1).padStart(7, ' ');
      console.log(`│  ${id} │ ${name} │ ${role} │ ${files} │ ${members} │`);
    }

    console.log('└───────────────────────────────────────────────────────────────────────────────────────────────────┘');
    console.log('\n💡 Tip: Run \x1b[36mcollabroom pull <roomId>\x1b[0m to download documents locally.');
    console.log('💡 Tip: Run \x1b[36mcollabroom sync <roomId>\x1b[0m for real-time live editing.\n');
  } catch (err: any) {
    console.error(`❌ Error listing rooms: ${err.message}`);
  }
}
