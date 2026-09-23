#!/usr/bin/env node

import { loginCommand, logoutCommand, whoamiCommand } from './commands/login';
import { roomsCommand } from './commands/rooms';
import { filesCommand, catCommand } from './commands/files';
import { pullCommand, pushCommand } from './commands/pull';
import { uploadCommand } from './commands/upload';
import { syncCommand } from './commands/watch';
import { openCommand } from './commands/open';

function printHelp() {
  console.log(`
\x1b[1m\x1b[35mCollabRoom CLI\x1b[0m - Real-Time Collaborative Workspace Command-Line Tool

\x1b[1mUSAGE:\x1b[0m
  collabroom <command> [arguments] [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[36mlogin\x1b[0m [email] [password]     Authenticate with your CollabRoom account
  \x1b[36mlogout\x1b[0m                        Log out of the current CLI session
  \x1b[36mwhoami\x1b[0m                        Display the currently signed-in user
  \x1b[36mrooms\x1b[0m / \x1b[36mlist\x1b[0m                 List all collaborative workspaces you belong to
  \x1b[36mfiles\x1b[0m <roomId>                List documents available in a specific room
  \x1b[36mopen\x1b[0m <roomId> [file]          \x1b[32m[OPEN IN DESKTOP APP + AUTO-SAVE]\x1b[0m Open file in local app (PPT, Word, Code) with cloud sync
  \x1b[36mcat\x1b[0m <fileId>                  View the content of a document directly in terminal
  \x1b[36mpull\x1b[0m <roomId> [folder]        Download room documents into a local directory
  \x1b[36mpush\x1b[0m <file> [fileId]           Push local file edits to the room
  \x1b[36mupload\x1b[0m <roomId> <path>         \x1b[32m[UPLOAD FILE OR ENTIRE FOLDER]\x1b[0m Upload files or folders recursively
  \x1b[36msync\x1b[0m <roomId> [folder]        \x1b[32m[REAL-TIME LIVE SYNC]\x1b[0m Watch and auto-sync edits bidirectionally
  \x1b[36mhelp\x1b[0m                          Show this help message

\x1b[1mEXAMPLES:\x1b[0m
  collabroom login
  collabroom rooms
  collabroom upload 4a3a3540-de84-4f95-b888-9797dbd55a1b ./my_folder
  collabroom pull 4a3a3540-de84-4f95-b888-9797dbd55a1b ./my_project
  collabroom sync 4a3a3540-de84-4f95-b888-9797dbd55a1b ./my_project
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'login':
      await loginCommand(args[1], args[2]);
      break;

    case 'logout':
      await logoutCommand();
      break;

    case 'whoami':
      await whoamiCommand();
      break;

    case 'rooms':
    case 'list':
    case 'ls':
      await roomsCommand();
      break;

    case 'files':
      await filesCommand(args[1]);
      break;

    case 'open':
      await openCommand(args[1], args[2]);
      break;

    case 'cat':
    case 'view':
      await catCommand(args[1]);
      break;

    case 'pull':
      await pullCommand(args[1], args[2]);
      break;

    case 'push':
      await pushCommand(args[1], args[2]);
      break;

    case 'upload':
      await uploadCommand(args[1], args[2]);
      break;

    case 'sync':
    case 'watch':
      await syncCommand(args[1], args[2]);
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
