'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import {
  Folder,
  FolderSync,
  Terminal,
  FileCode,
  Copy,
  Check,
  Bot,
  Sparkles,
  Zap,
} from 'lucide-react';

interface FolderLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  roomId: string;
  userRole?: string;
  onNavigateIntoFolder: () => void;
}

export const FolderLauncherModal: React.FC<FolderLauncherModalProps> = ({
  isOpen,
  onClose,
  folderName,
  roomId,
  userRole = 'EDITOR',
  onNavigateIntoFolder,
}) => {
  const { success } = useToast();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const isEditor = userRole === 'OWNER' || userRole === 'MANAGER' || userRole === 'EDITOR';

  const handleCopyCommand = (cmd: string, label: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(label);
    success(`Copied command: ${cmd}`);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Open Directory: ${folderName}`}
      description="Choose how you want to open and collaborate on this directory. AI agents and local tools sync automatically."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Navigation / In-App Option */}
        <div
          onClick={() => {
            onClose();
            onNavigateIntoFolder();
          }}
          className="flex items-start justify-between p-3.5 rounded-xl bg-card/80 border border-border hover:border-primary/50 hover:bg-card-hover transition-all cursor-pointer group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary-light border border-primary/30 mt-0.5">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-primary-light transition-colors">
                Browse Folder Inside Web App
              </h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Explore documents, upload files, and preview subdirectories directly in the browser.
              </p>
            </div>
          </div>
          <Button type="button" variant="primary" size="sm" className="text-xs flex-shrink-0">
            <span>Browse</span>
          </Button>
        </div>

        {/* Option 2: VS Code & AI Agent Live Sync Mode */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">Open in VS Code / Cursor + Live Auto-Save</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Cloud Sync
            </span>
          </div>

          <p className="text-[11px] text-muted">
            Pull this folder onto your computer and launch live watcher daemon. Any edits or AI agent writes auto-sync to cloud.
          </p>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-border/80">
            <code className="text-xs font-mono text-cyan-300 select-all">
              collabroom sync {roomId} ./{folderName}
            </code>
            <button
              type="button"
              onClick={() => handleCopyCommand(`collabroom sync ${roomId} ./${folderName}`, 'sync')}
              className="p-1 rounded hover:bg-slate-800 text-muted hover:text-white transition-colors ml-2"
              title="Copy Command"
            >
              {copiedCmd === 'sync' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Option 3: AI Agents in Terminal Mode */}
        <div className="p-3.5 rounded-xl bg-card/70 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">AI Agent Terminal Editing Mode</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Agent Compatible
            </span>
          </div>

          <p className="text-[11px] text-muted">
            Run autonomous coding agents directly against this workspace folder.
          </p>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-border/80">
            <code className="text-xs font-mono text-emerald-300 select-all">
              collabroom pull {roomId} && cd {folderName}
            </code>
            <button
              type="button"
              onClick={() => handleCopyCommand(`collabroom pull ${roomId} && cd ${folderName}`, 'agent')}
              className="p-1 rounded hover:bg-slate-800 text-muted hover:text-white transition-colors ml-2"
              title="Copy Command"
            >
              {copiedCmd === 'agent' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Live Auto-Save Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary-light">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Full Workspace Parity:</strong> Folder structures and permissions are preserved bidirectionally between your local system and CollabRoom Cloud.
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
