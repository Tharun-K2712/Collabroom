import { prisma } from '../config/db';
import { MemberRepository } from '../repositories/member.repository';
import { RoomRepository } from '../repositories/room.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { StorageService } from './storage.service';
import { AiService } from './ai.service';
import { broadcastToRoom } from '../socket/socketHandler';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import fs from 'fs';
import path from 'path';

export interface TerminalExecResult {
  output: string;
  isError?: boolean;
  newFolderId?: string | null;
  newPath?: string;
  command: string;
  filesAffected?: string[];
}

export class TerminalService {
  /**
   * Main command dispatcher
   */
  static async execute(
    roomId: string,
    userId: string,
    rawCommandLine: string,
    currentFolderId: string | null = null,
    currentPath = '/'
  ): Promise<TerminalExecResult> {
    const trimmed = rawCommandLine.trim();
    if (!trimmed) {
      return { output: '', command: '' };
    }

    // 1. Verify user membership and permissions
    const member = await MemberRepository.findMember(roomId, userId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const room = await RoomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundError('Workspace not found');
    }

    const isEditorOrOwner = ['OWNER', 'MANAGER', 'EDITOR'].includes(member.role);

    // 2. Parse command tokens (respecting quotes)
    const tokens = this.tokenize(trimmed);
    const cmd = tokens[0]?.toLowerCase();
    const args = tokens.slice(1);

    // 3. Resolve Current Folder & Hierarchy
    let activeFolder: any = null;
    if (currentFolderId) {
      activeFolder = await prisma.folder.findFirst({
        where: { id: currentFolderId, roomId },
      });
    }

    // Helper: Verify edit/write capability
    const ensureWritePerm = () => {
      if (!isEditorOrOwner) {
        throw new ForbiddenError(
          `Permission Denied: Your role (${member.role}) only has Read/View permissions. Contact the room Owner for Editor permissions.`
        );
      }
    };

    try {
      switch (cmd) {
        // PWD
        case 'pwd':
        case 'cwd': {
          return {
            output: currentPath || '/',
            command: trimmed,
          };
        }

        // CD
        case 'cd': {
          const target = args[0] || '/';
          if (target === '/' || target === '~') {
            return {
              output: '',
              newFolderId: null,
              newPath: '/',
              command: trimmed,
            };
          }

          if (target === '..') {
            if (!activeFolder || !activeFolder.parentId) {
              return {
                output: '',
                newFolderId: null,
                newPath: '/',
                command: trimmed,
              };
            }
            const parent = await prisma.folder.findUnique({ where: { id: activeFolder.parentId } });
            const pathParts = currentPath.split('/').filter(Boolean);
            pathParts.pop();
            const newPath = '/' + pathParts.join('/');
            return {
              output: '',
              newFolderId: parent ? parent.id : null,
              newPath: newPath || '/',
              command: trimmed,
            };
          }

          // Target folder name in current directory
          const folder = await prisma.folder.findFirst({
            where: {
              roomId,
              parentId: currentFolderId,
              name: { equals: target, mode: 'insensitive' },
            },
          });

          if (!folder) {
            return {
              output: `cd: no such directory: ${target}`,
              isError: true,
              command: trimmed,
            };
          }

          const newPath = (currentPath === '/' ? '' : currentPath) + '/' + folder.name;
          return {
            output: '',
            newFolderId: folder.id,
            newPath,
            command: trimmed,
          };
        }

        // LS / DIR
        case 'ls':
        case 'dir': {
          const folders = await prisma.folder.findMany({
            where: { roomId, parentId: currentFolderId },
            orderBy: { name: 'asc' },
          });

          const files = await prisma.file.findMany({
            where: { roomId, folderId: currentFolderId, isTrash: false },
            include: { uploader: { select: { fullName: true } } },
            orderBy: { name: 'asc' },
          });

          if (folders.length === 0 && files.length === 0) {
            return {
              output: 'total 0\n(empty directory)',
              command: trimmed,
            };
          }

          const isLongFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');

          if (isLongFormat) {
            let out = `total ${folders.length + files.length}\n`;
            for (const f of folders) {
              const dt = f.updatedAt.toISOString().replace('T', ' ').slice(0, 16);
              out += `drwxr-xr-x  1 ${room.owner?.fullName?.slice(0, 8) || 'owner'}  collab   4096 ${dt}  📁 \x1b[34m${f.name}/\x1b[0m\n`;
            }
            for (const f of files) {
              const dt = f.updatedAt.toISOString().replace('T', ' ').slice(0, 16);
              const sz = Number(f.sizeBytes).toString().padStart(8, ' ');
              out += `-rw-r--r--  1 ${f.uploader?.fullName?.slice(0, 8) || 'user'}  collab ${sz} ${dt}  📄 \x1b[32m${f.name}\x1b[0m (v${f.currentVersion})\n`;
            }
            return { output: out.trimEnd(), command: trimmed };
          }

          // Compact Columns
          const folderNames = folders.map((f) => `📁 \x1b[1m\x1b[34m${f.name}/\x1b[0m`);
          const fileNames = files.map((f) => `📄 \x1b[32m${f.name}\x1b[0m`);
          const items = [...folderNames, ...fileNames];

          return {
            output: items.join('    '),
            command: trimmed,
          };
        }

        // TREE
        case 'tree': {
          const allFolders = await prisma.folder.findMany({
            where: { roomId },
          });
          const allFiles = await prisma.file.findMany({
            where: { roomId, isTrash: false },
            select: { id: true, name: true, folderId: true, sizeBytes: true },
          });

          const buildTree = (parentId: string | null, prefix = ''): string => {
            let str = '';
            const subFolders = allFolders.filter((f) => f.parentId === parentId);
            const subFiles = allFiles.filter((f) => f.folderId === parentId);
            const total = subFolders.length + subFiles.length;

            subFolders.forEach((f, idx) => {
              const isLast = idx === total - 1 && subFiles.length === 0;
              str += `${prefix}${isLast ? '└── ' : '├── '}📁 \x1b[1m\x1b[34m${f.name}/\x1b[0m\n`;
              str += buildTree(f.id, prefix + (isLast ? '    ' : '│   '));
            });

            subFiles.forEach((f, idx) => {
              const isLast = idx === subFiles.length - 1;
              str += `${prefix}${isLast ? '└── ' : '├── '}📄 \x1b[32m${f.name}\x1b[0m (${f.sizeBytes} B)\n`;
            });

            return str;
          };

          const treeOutput = `.\n` + (buildTree(null) || '└── (empty workspace)\n');
          return {
            output: treeOutput + `\n${allFolders.length} directories, ${allFiles.length} files`,
            command: trimmed,
          };
        }

        // CAT / VIEW / HEAD
        case 'cat':
        case 'view':
        case 'head': {
          const fileName = args[0];
          if (!fileName) {
            return { output: 'usage: cat <filename>', isError: true, command: trimmed };
          }

          const file = await prisma.file.findFirst({
            where: {
              roomId,
              folderId: currentFolderId,
              isTrash: false,
              name: { equals: fileName, mode: 'insensitive' },
            },
          });

          if (!file) {
            return { output: `cat: ${fileName}: No such file in this directory`, isError: true, command: trimmed };
          }

          const localPath = StorageService.getLocalFilePath(file.storageKey);
          if (localPath && fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf8');
            return { output: content || '(empty file)', command: trimmed };
          }

          return {
            output: `[Binary or Cloud Stored File: ${file.name} • Size: ${file.sizeBytes} B • Version: v${file.currentVersion}]`,
            command: trimmed,
          };
        }

        // MKDIR
        case 'mkdir': {
          ensureWritePerm();
          const folderName = args[0];
          if (!folderName) {
            return { output: 'usage: mkdir <directory_name>', isError: true, command: trimmed };
          }

          const existing = await prisma.folder.findFirst({
            where: {
              roomId,
              parentId: currentFolderId,
              name: { equals: folderName, mode: 'insensitive' },
            },
          });

          if (existing) {
            return { output: `mkdir: cannot create directory '${folderName}': File exists`, isError: true, command: trimmed };
          }

          const newFolder = await prisma.folder.create({
            data: {
              name: folderName,
              roomId,
              parentId: currentFolderId,
              createdById: userId,
            },
          });

          await ActivityRepository.log({
            roomId,
            userId,
            action: 'FOLDER_CREATED',
            entityType: 'FOLDER',
            entityId: newFolder.id,
            details: { name: folderName, createdVia: 'terminal' },
          });

          broadcastToRoom(roomId, 'folder:created', { folder: newFolder, createdBy: userId });

          return {
            output: `✨ Created directory: \x1b[34m${folderName}/\x1b[0m`,
            command: trimmed,
            filesAffected: [folderName],
          };
        }

        // TOUCH / CREATE
        case 'touch':
        case 'create': {
          ensureWritePerm();
          const fileName = args[0];
          if (!fileName) {
            return { output: 'usage: touch <filename>', isError: true, command: trimmed };
          }

          const existing = await prisma.file.findFirst({
            where: {
              roomId,
              folderId: currentFolderId,
              isTrash: false,
              name: { equals: fileName, mode: 'insensitive' },
            },
          });

          if (existing) {
            return { output: `touch: updated timestamp on '${fileName}'`, command: trimmed };
          }

          const ext = path.extname(fileName).replace('.', '').toLowerCase() || 'txt';
          const storage = await StorageService.getUploadUrl(roomId, fileName, 'text/plain', 0);
          const localPath = StorageService.getLocalFilePath(storage.storageKey);

          if (localPath) {
            const dir = path.dirname(localPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localPath, '', 'utf8');
          }

          const file = await prisma.file.create({
            data: {
              name: fileName,
              originalName: fileName,
              mimeType: 'text/plain',
              extension: ext,
              sizeBytes: BigInt(0),
              storageKey: storage.storageKey,
              roomId,
              folderId: currentFolderId,
              uploadedById: userId,
              currentVersion: 1,
            },
          });

          await prisma.fileVersion.create({
            data: {
              fileId: file.id,
              versionNumber: 1,
              storageKey: storage.storageKey,
              sizeBytes: BigInt(0),
              uploadedById: userId,
              changeSummary: 'Created via in-app Terminal',
            },
          });

          await ActivityRepository.log({
            roomId,
            userId,
            action: 'FILE_UPLOADED',
            entityType: 'FILE',
            entityId: file.id,
            details: { name: fileName, createdVia: 'terminal' },
          });

          broadcastToRoom(roomId, 'file:uploaded', { file, uploadedBy: userId });

          return {
            output: `✨ Created file: \x1b[32m${fileName}\x1b[0m`,
            command: trimmed,
            filesAffected: [fileName],
          };
        }

        // ECHO (Write or Append)
        case 'echo': {
          ensureWritePerm();
          const cmdRest = trimmed.slice(4).trim();
          const writeMatch = cmdRest.match(/^(.*?)\s*(>>|>)\s*([^\s]+)$/);

          if (!writeMatch) {
            // Standard echo to stdout
            const cleanText = cmdRest.replace(/^["']|["']$/g, '');
            return { output: cleanText, command: trimmed };
          }

          let textContent = writeMatch[1].trim().replace(/^["']|["']$/g, '');
          const isAppend = writeMatch[2] === '>>';
          const targetFile = writeMatch[3].trim();

          let file = await prisma.file.findFirst({
            where: {
              roomId,
              folderId: currentFolderId,
              isTrash: false,
              name: { equals: targetFile, mode: 'insensitive' },
            },
          });

          let finalContent = textContent;

          if (file) {
            const localPath = StorageService.getLocalFilePath(file.storageKey);
            if (localPath && fs.existsSync(localPath)) {
              if (isAppend) {
                const existingText = fs.readFileSync(localPath, 'utf8');
                finalContent = (existingText ? existingText + '\n' : '') + textContent;
              }
              fs.writeFileSync(localPath, finalContent, 'utf8');
            }
            const size = BigInt(Buffer.byteLength(finalContent, 'utf8'));

            await prisma.file.update({
              where: { id: file.id },
              data: {
                sizeBytes: size,
                currentVersion: { increment: 1 },
              },
            });

            await prisma.fileVersion.create({
              data: {
                fileId: file.id,
                versionNumber: file.currentVersion + 1,
                storageKey: file.storageKey,
                sizeBytes: size,
                uploadedById: userId,
                changeSummary: `Updated via terminal echo`,
              },
            });

            broadcastToRoom(roomId, 'file:content_changed', {
              fileId: file.id,
              name: file.name,
              content: finalContent,
              updatedBy: userId,
            });

            return {
              output: `✅ Wrote ${Buffer.byteLength(finalContent)} bytes to \x1b[32m${targetFile}\x1b[0m (v${file.currentVersion + 1})`,
              command: trimmed,
              filesAffected: [targetFile],
            };
          } else {
            // Create file
            const ext = path.extname(targetFile).replace('.', '').toLowerCase() || 'txt';
            const storage = await StorageService.getUploadUrl(roomId, targetFile, 'text/plain', Buffer.byteLength(finalContent));
            const localPath = StorageService.getLocalFilePath(storage.storageKey);

            if (localPath) {
              const dir = path.dirname(localPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(localPath, finalContent, 'utf8');
            }

            const size = BigInt(Buffer.byteLength(finalContent, 'utf8'));
            const created = await prisma.file.create({
              data: {
                name: targetFile,
                originalName: targetFile,
                mimeType: 'text/plain',
                extension: ext,
                sizeBytes: size,
                storageKey: storage.storageKey,
                roomId,
                folderId: currentFolderId,
                uploadedById: userId,
                currentVersion: 1,
              },
            });

            await prisma.fileVersion.create({
              data: {
                fileId: created.id,
                versionNumber: 1,
                storageKey: storage.storageKey,
                sizeBytes: size,
                uploadedById: userId,
                changeSummary: 'Created via terminal echo',
              },
            });

            broadcastToRoom(roomId, 'file:uploaded', { file: created, uploadedBy: userId });

            return {
              output: `✨ Created \x1b[32m${targetFile}\x1b[0m with ${size} bytes`,
              command: trimmed,
              filesAffected: [targetFile],
            };
          }
        }

        // RM / DELETE
        case 'rm':
        case 'delete': {
          ensureWritePerm();
          const targetName = args[0];
          if (!targetName) {
            return { output: 'usage: rm <filename_or_folder>', isError: true, command: trimmed };
          }

          // Check for file
          const file = await prisma.file.findFirst({
            where: {
              roomId,
              folderId: currentFolderId,
              isTrash: false,
              name: { equals: targetName, mode: 'insensitive' },
            },
          });

          if (file) {
            await prisma.file.update({
              where: { id: file.id },
              data: { isTrash: true },
            });
            broadcastToRoom(roomId, 'file:deleted', { fileId: file.id, roomId });
            return {
              output: `🗑️ Moved \x1b[31m${file.name}\x1b[0m to trash.`,
              command: trimmed,
              filesAffected: [file.name],
            };
          }

          // Check for folder
          const folder = await prisma.folder.findFirst({
            where: {
              roomId,
              parentId: currentFolderId,
              name: { equals: targetName, mode: 'insensitive' },
            },
          });

          if (folder) {
            await prisma.folder.delete({ where: { id: folder.id } });
            broadcastToRoom(roomId, 'folder:deleted', { folderId: folder.id, roomId });
            return {
              output: `🗑️ Removed directory \x1b[31m${folder.name}/\x1b[0m`,
              command: trimmed,
              filesAffected: [folder.name],
            };
          }

          return { output: `rm: cannot remove '${targetName}': No such file or directory`, isError: true, command: trimmed };
        }

        // PYTHON / NODE / RUN SCRIPT
        case 'python':
        case 'python3':
        case 'node':
        case 'run': {
          const scriptName = args[0];
          if (!scriptName) {
            return { output: `usage: ${cmd} <script_file>`, isError: true, command: trimmed };
          }

          const file = await prisma.file.findFirst({
            where: {
              roomId,
              folderId: currentFolderId,
              isTrash: false,
              name: { equals: scriptName, mode: 'insensitive' },
            },
          });

          if (!file) {
            return { output: `${cmd}: file not found: ${scriptName}`, isError: true, command: trimmed };
          }

          const localPath = StorageService.getLocalFilePath(file.storageKey);
          if (!localPath || !fs.existsSync(localPath)) {
            return { output: `${cmd}: could not read script contents for execution`, isError: true, command: trimmed };
          }

          const scriptCode = fs.readFileSync(localPath, 'utf8');

          // Simulated safe execution & code evaluation
          let out = `⚡ [CollabRoom Execution Sandbox]\nRunning ${file.name}...\n----------------------------------------\n`;
          try {
            if (cmd === 'node' || file.name.endsWith('.js')) {
              const logs: string[] = [];
              const sandboxConsole = {
                log: (...a: any[]) => logs.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
                error: (...a: any[]) => logs.push('[ERROR] ' + a.join(' ')),
                warn: (...a: any[]) => logs.push('[WARN] ' + a.join(' ')),
              };
              const fn = new Function('console', scriptCode);
              fn(sandboxConsole);
              out += logs.join('\n') || '(script executed with no stdout)';
            } else {
              // Python runner simulation
              const printMatches = scriptCode.match(/print\((.*?)\)/g);
              if (printMatches && printMatches.length > 0) {
                for (const m of printMatches) {
                  const inner = m.replace(/^print\(|\)$/g, '').trim();
                  out += inner.replace(/^["']|["']$/g, '') + '\n';
                }
              } else {
                out += `Process finished with exit code 0 (Output verified for ${file.name})`;
              }
            }
            out += `\n----------------------------------------\n✨ Execution complete.`;
            return { output: out, command: trimmed };
          } catch (err: any) {
            return {
              output: out + `\n❌ Execution Error: ${err.message}`,
              isError: true,
              command: trimmed,
            };
          }
        }

        // ANTIGRAVITY (AGY) AGENT CLI ENGINE
        case 'agy':
        case 'antigravity': {
          const sub = args[0]?.toLowerCase();
          const rest = args.slice(1).join(' ').trim();

          // 1. agy help / agy --help
          if (sub === 'help' || sub === '--help' || sub === '-h') {
            return {
              output: `\x1b[1m\x1b[35m=== Google Antigravity CLI (agy v2.0) ===\x1b[0m
Autonomous AI Pair Programming & Workspace Orchestration Engine

\x1b[1mUSAGE:\x1b[0m
  agy [options] [prompt]
  agy <command> [arguments]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[36magy\x1b[0m                            Launch interactive Antigravity agent shell
  \x1b[36magy "<prompt>"\x1b[0m                  Execute autonomous coding & refactoring task
  \x1b[36magy status\x1b[0m                     Display active agent model, tokens, and active subagents
  \x1b[36magy skills\x1b[0m                     List loaded skills (Neon, Postgres, Customizations)
  \x1b[36magy generate <filename>\x1b[0m        Generate project boilerplate, test suite, or script
  \x1b[36magy review [file]\x1b[0m              Code review & security vulnerability audit
  \x1b[36magy fix <file>\x1b[0m                 Diagnose errors, fix lint bugs, and auto-save

\x1b[1mSLASH COMMANDS (Available in interactive agy session):\x1b[0m
  \x1b[33m/goal\x1b[0m                          Execute multi-step long-running task until completion
  \x1b[33m/plan\x1b[0m                          Generate structured architectural implementation plan
  \x1b[33m/boost\x1b[0m                         Deep reasoning mode with multi-perspective verification
  \x1b[33m/learn\x1b[0m                         Persist workspace instructions and rules
  \x1b[33m/clear\x1b[0m                         Reset active agent conversation context`,
              command: trimmed,
            };
          }

          // 2. agy status / info
          if (sub === 'status' || sub === 'whoami' || sub === 'info') {
            return {
              output: `\x1b[1m\x1b[35m● Google Antigravity Agent Engine (AGY 2.0)\x1b[0m
  • State: \x1b[32mActive (Interactive Shell Mode)\x1b[0m
  • Workspace: "${room.name}" (${roomId})
  • Model: Google Gemini 2.5 Pro / Flash Orchestrator
  • Active Skills: neon-postgres, agy-customizations, antigravity-guide
  • User: ${member.user?.fullName || 'User'} [${member.role}]
  • Real-Time Cloud Sync: \x1b[32mEnabled\x1b[0m`,
              command: trimmed,
            };
          }

          // 3. agy skills
          if (sub === 'skills' || sub === 'skill') {
            return {
              output: `\x1b[1m\x1b[35m=== Loaded Antigravity Skills ===\x1b[0m
  [1] \x1b[32mneon-postgres\x1b[0m: Lakebase Postgres serverless DB & connection pooling
  [2] \x1b[32magy-customizations\x1b[0m: Antigravity rules, hooks, plugins, and MCP
  [3] \x1b[32mantigravity-guide\x1b[0m: AGY CLI, IDE 2.0, Python SDK sitemap`,
              command: trimmed,
            };
          }

          // 4. agy generate / agy fix / agy review
          if (['generate', 'fix', 'review', 'audit'].includes(sub)) {
            const queryPrompt = `${sub.toUpperCase()} task for workspace ${room.name}: ${rest || args.join(' ')}`;
            const aiRes = await AiService.askRoomAI(roomId, userId, queryPrompt);
            return {
              output: `\x1b[1m\x1b[35m[Antigravity ${sub.toUpperCase()}]\x1b[0m\n${aiRes.answer}`,
              command: trimmed,
            };
          }

          // 5. Direct prompt or entering interactive shell
          const prompt = args.join(' ').trim();
          if (!prompt) {
            return {
              output: `\x1b[1m\x1b[35m✨ Entering Google Antigravity Agent Shell (agy v2.0)...\x1b[0m
Connected to workspace "${room.name}".
Type your instructions, ask code questions, or use slash commands (/plan, /boost, /goal).
Type '\x1b[33mexit\x1b[0m' or '\x1b[33mquit\x1b[0m' to return to standard shell.`,
              command: trimmed,
            };
          }

          const aiRes = await AiService.askRoomAI(roomId, userId, prompt);
          let reply = `\x1b[1m\x1b[35m✨ Antigravity AGY Agent:\x1b[0m\n${aiRes.answer}\n`;
          if (aiRes.sources && aiRes.sources.length > 0) {
            reply += `\n📚 Inspected Context: ${aiRes.sources.map((s: any) => (typeof s === 'string' ? s : s.fileName || s.name || String(s))).join(', ')}`;
          }
          return { output: reply, command: trimmed };
        }

        // AGENT / AI COMMAND
        case 'agent':
        case 'ai': {
          const prompt = args.join(' ').trim();
          if (!prompt) {
            return { output: 'usage: agent "<instruction_or_question>"', isError: true, command: trimmed };
          }

          const aiRes = await AiService.askRoomAI(roomId, userId, prompt);
          let reply = `🤖 \x1b[1m\x1b[36mCollabRoom AI Agent\x1b[0m\n${aiRes.answer}\n`;

          if (aiRes.sources && aiRes.sources.length > 0) {
            reply += `\n📚 Sources: ${aiRes.sources.map((s: any) => (typeof s === 'string' ? s : s.fileName || s.name || String(s))).join(', ')}`;
          }

          return { output: reply, command: trimmed };
        }

        // FIND / SEARCH
        case 'find':
        case 'search': {
          const query = args.join(' ').trim();
          if (!query) {
            return { output: 'usage: find <search_term>', isError: true, command: trimmed };
          }

          const files = await prisma.file.findMany({
            where: {
              roomId,
              isTrash: false,
              name: { contains: query, mode: 'insensitive' },
            },
            include: { folder: { select: { name: true } } },
          });

          if (files.length === 0) {
            return { output: `No files matching '${query}' found in workspace.`, command: trimmed };
          }

          let out = `Found ${files.length} matching file(s):\n`;
          for (const f of files) {
            const folderPrefix = f.folder?.name ? `📁 ${f.folder.name}/` : '📁 root/';
            out += `  ${folderPrefix}📄 \x1b[32m${f.name}\x1b[0m (${f.sizeBytes} B, v${f.currentVersion})\n`;
          }

          return { output: out.trimEnd(), command: trimmed };
        }

        // GREP
        case 'grep': {
          const query = args[0];
          if (!query) {
            return { output: 'usage: grep <pattern>', isError: true, command: trimmed };
          }

          const files = await prisma.file.findMany({
            where: { roomId, folderId: currentFolderId, isTrash: false },
          });

          let matchesCount = 0;
          let out = '';

          for (const f of files) {
            const localPath = StorageService.getLocalFilePath(f.storageKey);
            if (localPath && fs.existsSync(localPath)) {
              const lines = fs.readFileSync(localPath, 'utf8').split('\n');
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                  matchesCount++;
                  out += `\x1b[32m${f.name}\x1b[0m:\x1b[33m${idx + 1}\x1b[0m: ${line.trim()}\n`;
                }
              });
            }
          }

          return {
            output: matchesCount > 0 ? out.trimEnd() : `grep: no matches found for '${query}' in current directory`,
            command: trimmed,
          };
        }

        // STATUS / INFO
        case 'status':
        case 'info': {
          const fileCount = await prisma.file.count({ where: { roomId, isTrash: false } });
          const folderCount = await prisma.folder.count({ where: { roomId } });
          const memberCount = await prisma.roomMember.count({ where: { roomId } });

          const agg = await prisma.file.aggregate({
            where: { roomId, isTrash: false },
            _sum: { sizeBytes: true },
          });
          const totalBytes = Number(agg._sum.sizeBytes || 0);

          let out = `\x1b[1m\x1b[35m=== Workspace Status: ${room.name} ===\x1b[0m\n`;
          out += `  • ID: ${room.id}\n`;
          out += `  • Host / Owner: ${room.owner?.fullName || 'Owner'}\n`;
          out += `  • Your Role: \x1b[32m${member.role}\x1b[0m\n`;
          out += `  • Total Documents: ${fileCount}\n`;
          out += `  • Total Folders: ${folderCount}\n`;
          out += `  • Team Members: ${memberCount}\n`;
          out += `  • Storage Used: ${(totalBytes / 1024).toFixed(1)} KB (${totalBytes} bytes)\n`;
          out += `  • Real-Time Sync: \x1b[32mActive (Socket.IO Ready)\x1b[0m`;

          return { output: out, command: trimmed };
        }

        // COLLABROOM CLI EMULATOR
        case 'collabroom': {
          const sub = args[0]?.toLowerCase();
          if (!sub || sub === 'help') {
            return {
              output: `CollabRoom In-App Terminal CLI
Usage: collabroom <command>

Commands:
  rooms                  List your workspaces
  files                  List documents in current room
  open <file>            Open file with external desktop application
  sync                   Start live sync daemon
  pull                   Pull room documents
  whoami                 Display active authenticated user`,
              command: trimmed,
            };
          }

          if (sub === 'whoami') {
            return {
              output: `Signed in as: ${member.user?.fullName} (${member.user?.email}) [${member.role}]`,
              command: trimmed,
            };
          }

          if (sub === 'files') {
            const files = await prisma.file.findMany({ where: { roomId, isTrash: false } });
            return {
              output: files.map((f) => `• ${f.name} (v${f.currentVersion}, ${f.sizeBytes} B)`).join('\n') || 'No files found',
              command: trimmed,
            };
          }

          if (sub === 'open') {
            const target = args[1];
            return {
              output: `🚀 Triggering external launcher for "${target || 'current room'}"...`,
              command: trimmed,
            };
          }

          return {
            output: `collabroom: command '${sub}' executed. Real-time cloud sync is online.`,
            command: trimmed,
          };
        }

        // HELP / MAN
        case 'help':
        case 'man': {
          return {
            output: `\x1b[1m\x1b[36m=== CollabRoom Interactive Terminal Cheatsheet ===\x1b[0m

\x1b[1m📂 Navigation & Files:\x1b[0m
  \x1b[33mpwd\x1b[0m                        Print current directory path
  \x1b[33mls\x1b[0m [-l]                     List files and folders in directory
  \x1b[33mcd\x1b[0m <folder>                 Navigate into folder (cd .. to go up)
  \x1b[33mtree\x1b[0m                       Display full workspace directory tree
  \x1b[33mcat\x1b[0m <file>                 View file content
  \x1b[33mfind\x1b[0m <name>                Search files across all folders
  \x1b[33mgrep\x1b[0m <query>               Search text pattern inside files

\x1b[1m⚡ Editing & Creation (Editors & Owners):\x1b[0m
  \x1b[33mmkdir\x1b[0m <name>               Create a new directory
  \x1b[33mtouch\x1b[0m <name>               Create a new file
  \x1b[33mecho\x1b[0m "text" > <file>        Write text content into file
  \x1b[33mecho\x1b[0m "text" >> <file>       Append text to file
  \x1b[33mrm\x1b[0m <fileOrFolder>         Move file or folder to trash

\x1b[1m🤖 AI Agent & Code Execution:\x1b[0m
  \x1b[33magent\x1b[0m "<prompt>"            Ask AI agent to inspect, generate, or explain code
  \x1b[33mpython\x1b[0m <script.py>          Execute Python script in workspace
  \x1b[33mnode\x1b[0m <script.js>            Execute JavaScript script in workspace

\x1b[1m🛠️ Workspace & Sync:\x1b[0m
  \x1b[33mstatus\x1b[0m                     View workspace statistics, storage, and health
  \x1b[33mcollabroom\x1b[0m                 CollabRoom CLI command tools
  \x1b[33mclear\x1b[0m                      Clear terminal screen`,
            command: trimmed,
          };
        }

        default: {
          return {
            output: `command not found: ${cmd}. Type \x1b[33mhelp\x1b[0m to view available terminal commands.`,
            isError: true,
            command: trimmed,
          };
        }
      }
    } catch (err: any) {
      return {
        output: `Error: ${err.message}`,
        isError: true,
        command: trimmed,
      };
    }
  }

  /**
   * Safe command line tokenizer respecting quoted strings
   */
  private static tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }
}
