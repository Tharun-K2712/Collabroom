'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { formatBytes } from '@/lib/utils';
import { getFullFileUrl, downloadFileFromUrl } from '@/lib/api';
import {
  ExternalLink,
  Laptop,
  Globe,
  FileCode,
  Download,
  Copy,
  Check,
  Sparkles,
  Presentation,
  FileText,
  Sheet,
  Eye,
  Edit3,
  Terminal,
  Zap,
  FolderSync,
} from 'lucide-react';

export interface OpenTargetApp {
  id: string;
  name: string;
  description: string;
  category: 'desktop' | 'web' | 'editor' | 'cli';
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  actionType: 'protocol' | 'web_url' | 'cli' | 'in_app' | 'download';
  urlOrCommand?: string;
}

interface OpenWithModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    originalName: string;
    extension: string;
    sizeBytes: string | number | bigint;
    currentVersion: number;
    roomId: string;
    uploader?: { fullName: string };
  } | null;
  downloadUrl?: string | null;
  userRole?: string;
  onOpenInAppPreview: (fileId: string) => void;
}

export const OpenWithModal: React.FC<OpenWithModalProps> = ({
  isOpen,
  onClose,
  file,
  downloadUrl,
  userRole = 'EDITOR',
  onOpenInAppPreview,
}) => {
  const { success, error: toastError } = useToast();
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  if (!file) return null;

  const ext = (file.extension || '').toLowerCase().replace('.', '');
  const isEditorOrOwner = userRole === 'OWNER' || userRole === 'MANAGER' || userRole === 'EDITOR';

  // Determine App Options dynamically based on document extension
  const getAvailableApps = (): OpenTargetApp[] => {
    const apps: OpenTargetApp[] = [];
    const fullDownloadUrl = getFullFileUrl(downloadUrl);
    const encodedUrl = encodeURIComponent(fullDownloadUrl);

    // 1. PowerPoint / Presentation files
    if (['ppt', 'pptx', 'odp', 'pps', 'ppsx', 'potx'].includes(ext)) {
      apps.push({
        id: 'ms_powerpoint_desktop',
        name: 'Microsoft PowerPoint Desktop',
        description: isEditorOrOwner
          ? 'Open in PowerPoint with real-time cloud auto-save on Ctrl+S'
          : 'View slides in desktop PowerPoint presentation viewer',
        category: 'desktop',
        icon: Presentation,
        badge: 'Recommended',
        badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        actionType: 'protocol',
        urlOrCommand: fullDownloadUrl
          ? `ms-powerpoint:${isEditorOrOwner ? 'ofe' : 'ofv'}|u|${fullDownloadUrl}`
          : undefined,
      });

      apps.push({
        id: 'office_online_ppt',
        name: 'Microsoft PowerPoint Online (365)',
        description: 'Edit and present slides in your web browser via Microsoft 365',
        category: 'web',
        icon: Globe,
        badge: 'Web App',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        actionType: 'web_url',
        urlOrCommand: `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`,
      });

      apps.push({
        id: 'google_slides',
        name: 'Google Slides / Docs Viewer',
        description: 'Instant Google Workspace slide viewer and previewer',
        category: 'web',
        icon: Globe,
        actionType: 'web_url',
        urlOrCommand: `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`,
      });
    }

    // 2. Word / Text Documents
    else if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
      apps.push({
        id: 'ms_word_desktop',
        name: 'Microsoft Word Desktop',
        description: isEditorOrOwner
          ? 'Open in Word with real-time cloud auto-save on Ctrl+S'
          : 'View document in Microsoft Word',
        category: 'desktop',
        icon: FileText,
        badge: 'Recommended',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        actionType: 'protocol',
        urlOrCommand: fullDownloadUrl
          ? `ms-word:${isEditorOrOwner ? 'ofe' : 'ofv'}|u|${fullDownloadUrl}`
          : undefined,
      });

      apps.push({
        id: 'office_online_word',
        name: 'Microsoft Word Online (365)',
        description: 'Collaborate and view documents via Office 365 Web',
        category: 'web',
        icon: Globe,
        badge: 'Web App',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        actionType: 'web_url',
        urlOrCommand: `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`,
      });

      apps.push({
        id: 'google_docs',
        name: 'Google Docs Viewer',
        description: 'Open in Google Docs cloud viewer',
        category: 'web',
        icon: Globe,
        actionType: 'web_url',
        urlOrCommand: `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`,
      });
    }

    // 3. Excel / Spreadsheets
    else if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) {
      apps.push({
        id: 'ms_excel_desktop',
        name: 'Microsoft Excel Desktop',
        description: isEditorOrOwner
          ? 'Open in Excel with real-time cloud auto-save on Ctrl+S'
          : 'View spreadsheet in Excel',
        category: 'desktop',
        icon: Sheet,
        badge: 'Recommended',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        actionType: 'protocol',
        urlOrCommand: fullDownloadUrl
          ? `ms-excel:${isEditorOrOwner ? 'ofe' : 'ofv'}|u|${fullDownloadUrl}`
          : undefined,
      });

      apps.push({
        id: 'office_online_excel',
        name: 'Microsoft Excel Online (365)',
        description: 'Edit worksheets and formulas in Microsoft 365 Web',
        category: 'web',
        icon: Globe,
        badge: 'Web App',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        actionType: 'web_url',
        urlOrCommand: `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`,
      });

      apps.push({
        id: 'google_sheets',
        name: 'Google Sheets Viewer',
        description: 'View spreadsheet in Google Sheets cloud viewer',
        category: 'web',
        icon: Globe,
        actionType: 'web_url',
        urlOrCommand: `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`,
      });
    }

    // 4. Code & Scripts
    else if (
      [
        'py',
        'ipynb',
        'js',
        'ts',
        'tsx',
        'jsx',
        'json',
        'html',
        'css',
        'c',
        'cpp',
        'java',
        'go',
        'rs',
        'sh',
        'sql',
        'md',
        'yaml',
        'yml',
        'txt',
      ].includes(ext)
    ) {
      apps.push({
        id: 'vscode_desktop',
        name: 'Visual Studio Code / Cursor',
        description: 'Open code with syntax highlighting, extensions, and live terminal sync',
        category: 'desktop',
        icon: FileCode,
        badge: 'Developer Choice',
        badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        actionType: 'cli',
        urlOrCommand: `collabroom open ${file.roomId} "${file.name}"`,
      });
    }

    // 5. Always include Live In-App Editor / Previewer
    apps.push({
      id: 'in_app_editor',
      name: 'CollabRoom Cloud Editor & Previewer',
      description: isEditorOrOwner
        ? 'Real-time collaborative web editor with instant autosave and revision tracking'
        : 'Instant in-browser document viewer with zoom and high-fidelity rendering',
      category: 'editor',
      icon: isEditorOrOwner ? Edit3 : Eye,
      badge: 'Built-in',
      badgeColor: 'bg-primary/20 text-primary-light border-primary/30',
      actionType: 'in_app',
    });

    // 6. CollabRoom CLI Live Daemon Sync (Auto-Saves Any Desktop App to Cloud)
    apps.push({
      id: 'cli_live_sync',
      name: 'Desktop App Auto-Save Watcher (CMD / Terminal)',
      description:
        'Opens in your system default app (PowerPoint, Word, VS Code, etc.). Edits automatically sync to cloud on Ctrl+S',
      category: 'cli',
      icon: Terminal,
      badge: 'Auto-Save Cloud Engine',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      actionType: 'cli',
      urlOrCommand: `collabroom open ${file.roomId} "${file.name}"`,
    });

    // 7. Direct Download Option
    if (fullDownloadUrl) {
      apps.push({
        id: 'direct_download',
        name: 'Download Local Copy',
        description: 'Save a binary copy directly to your Downloads folder',
        category: 'desktop',
        icon: Download,
        actionType: 'download',
        urlOrCommand: fullDownloadUrl,
      });
    }

    return apps;
  };

  const availableApps = getAvailableApps();
  const selectedApp = availableApps.find((a) => a.id === selectedAppId) || availableApps[0];

  const handleCopyCliCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    success('Command copied to clipboard! Run in CMD or PowerShell to open with live cloud sync.');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleLaunchApp = (app: OpenTargetApp) => {
    if (app.actionType === 'in_app') {
      onClose();
      onOpenInAppPreview(file.id);
    } else if (app.actionType === 'web_url' && app.urlOrCommand) {
      window.open(app.urlOrCommand, '_blank', 'noopener,noreferrer');
      onClose();
    } else if (app.actionType === 'protocol' && app.urlOrCommand) {
      // Launch protocol URI (e.g. ms-powerpoint:ofe|u|...)
      window.location.href = app.urlOrCommand;
      success(`Opening "${file.name}" in ${app.name}...`);
      setTimeout(() => onClose(), 1000);
    } else if (app.actionType === 'download' && app.urlOrCommand) {
      downloadFileFromUrl(app.urlOrCommand, file.originalName || file.name)
        .then(() => success(`Downloaded "${file.name}"`))
        .catch((err) => toastError(err.message || 'Download failed'));
      onClose();
    } else if (app.actionType === 'cli' && app.urlOrCommand) {
      handleCopyCliCommand(app.urlOrCommand);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Document With..."
      description="Choose your preferred application to view or edit this document. All changes auto-save back to your cloud room."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Document Header Info Card */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-input/70 border border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light flex-shrink-0">
              {['ppt', 'pptx'].includes(ext) ? (
                <Presentation className="w-5 h-5 text-orange-400" />
              ) : ['doc', 'docx'].includes(ext) ? (
                <FileText className="w-5 h-5 text-blue-400" />
              ) : ['xls', 'xlsx', 'csv'].includes(ext) ? (
                <Sheet className="w-5 h-5 text-emerald-400" />
              ) : (
                <FileCode className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{file.name}</h4>
              <p className="text-xs text-muted flex items-center gap-2">
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>•</span>
                <span>v{file.currentVersion}</span>
                <span>•</span>
                <span className="truncate">By {file.uploader?.fullName || 'Host'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                isEditorOrOwner
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-500/10 text-slate-300 border-border'
              }`}
            >
              {isEditorOrOwner ? '⚡ Editor (Auto-Save)' : '👁️ Viewer'}
            </span>
          </div>
        </div>

        {/* Application Choices List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider px-1">
            Available Launch Applications
          </p>

          <div className="grid grid-cols-1 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
            {availableApps.map((app) => {
              const IconComp = app.icon;
              const isSelected = selectedApp.id === app.id;

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10'
                      : 'bg-card/70 border-border hover:border-primary/40 hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary-light'
                          : 'bg-input border-border text-muted'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{app.name}</span>
                        {app.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                              app.badgeColor || 'bg-input text-muted border-border'
                            }`}
                          >
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">{app.description}</p>

                      {/* CLI Command snippet if CLI action */}
                      {app.actionType === 'cli' && app.urlOrCommand && (
                        <div className="flex items-center gap-2 pt-1">
                          <code className="px-2 py-0.5 rounded bg-slate-950 border border-border font-mono text-[11px] text-cyan-300 select-all">
                            {app.urlOrCommand}
                          </code>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCliCommand(app.urlOrCommand!);
                            }}
                            className="p-1 rounded bg-card hover:bg-card-hover border border-border text-muted hover:text-white transition-colors"
                            title="Copy Command"
                          >
                            {copiedCmd ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={isSelected ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunchApp(app);
                    }}
                    className="ml-3 flex-shrink-0 text-xs"
                  >
                    {app.actionType === 'in_app' ? (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        <span>Launch</span>
                      </>
                    ) : app.actionType === 'cli' ? (
                      <>
                        <Terminal className="w-3 h-3 mr-1" />
                        <span>Run Sync</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        <span>Open</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Auto-Save Information Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Automatic Cloud Synchronization:</strong> Whether you edit in browser or on your desktop in
            PowerPoint, Word, or VS Code, every save is streamed live to your room members via WebSockets.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              onOpenInAppPreview(file.id);
            }}
            className="text-xs text-muted hover:text-white"
          >
            Open in Quick Previewer
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleLaunchApp(selectedApp)}
              className="text-xs"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              <span>Launch {selectedApp.name.split(' ')[0]}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
