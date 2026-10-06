'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { api, getFullFileUrl, downloadFileFromUrl } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatBytes, formatDate, getFileTypeInfo } from '@/lib/utils';
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Users,
  HardDrive,
  Activity,
  Settings,
  Plus,
  UserPlus,
  UploadCloud,
  FolderPlus,
  Sparkles,
  Download,
  Eye,
  Trash2,
  History,
  MessageSquare,
  MoreVertical,
  Shield,
  Lock,
  Globe,
  Loader2,
  Edit2,
  Folder as FolderIcon,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Laptop,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { InviteModal } from '@/components/rooms/InviteModal';
import { FileUploaderModal } from '@/components/files/FileUploaderModal';
import { CreateFolderModal } from '@/components/files/CreateFolderModal';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { VersionHistoryModal } from '@/components/files/VersionHistoryModal';
import { CommentsDrawer } from '@/components/files/CommentsDrawer';
import { PermissionMatrixModal } from '@/components/rooms/PermissionMatrixModal';
import { RoomAIChatDrawer } from '@/components/ai/RoomAIChatDrawer';
import { OpenWithModal } from '@/components/files/OpenWithModal';
import { FolderLauncherModal } from '@/components/files/FolderLauncherModal';
import { RoomTerminalDrawer } from '@/components/terminal/RoomTerminalDrawer';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function RoomDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.roomId as string;
  const initialFileId = searchParams.get('fileId');

  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [room, setRoom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'members' | 'activity' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Files & Folders state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root Directory' },
  ]);
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(initialFileId || null);
  const [openWithFile, setOpenWithFile] = useState<any | null>(null);
  const [openWithDownloadUrl, setOpenWithDownloadUrl] = useState<string | null>(null);
  const [launcherFolder, setLauncherFolder] = useState<any | null>(null);
  const [versionFile, setVersionFile] = useState<any | null>(null);
  const [commentsFile, setCommentsFile] = useState<any | null>(null);
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<any | null>(null);

  const handleOpenWithApp = async (file: any) => {
    setOpenWithFile(file);
    try {
      const res = await api.get<any>(`/files/${file.id}/download-url`);
      if (res.success && res.data) {
        setOpenWithDownloadUrl(getFullFileUrl(res.data.downloadUrl));
      }
    } catch {
      setOpenWithDownloadUrl(null);
    }
  };

  // Room Settings State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#4F46E5');
  const [editPrivacy, setEditPrivacy] = useState<'PRIVATE' | 'INVITE_ONLY'>('PRIVATE');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Fetch Room Master Data
  const loadRoom = async () => {
    try {
      const res = await api.get<any>(`/rooms/${roomId}`);
      if (res.success && res.data) {
        setRoom(res.data);
        setEditName(res.data.name);
        setEditDesc(res.data.description || '');
        setEditColor(res.data.color || '#4F46E5');
        setEditPrivacy(res.data.privacy || 'PRIVATE');
      }
    } catch (err: any) {
      error(err.message || 'Failed to load room');
      router.push('/rooms');
    }
  };

  // Fetch Files & Folders
  const loadFilesAndFolders = async () => {
    try {
      const folderQuery = currentFolderId ? `?folderId=${currentFolderId}` : '';
      const [filesRes, foldersRes] = await Promise.all([
        api.get<any>(`/rooms/${roomId}/files${folderQuery}`),
        api.get<any[]>(`/rooms/${roomId}/folders${folderQuery}`),
      ]);

      if (filesRes.success && filesRes.data) {
        setFiles(filesRes.data);
      }
      if (foldersRes.success && foldersRes.data) {
        setFolders(foldersRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Members
  const loadMembers = async () => {
    try {
      const res = await api.get<any[]>(`/rooms/${roomId}/members`);
      if (res.success && res.data) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Activity Log
  const loadActivities = async () => {
    try {
      const res = await api.get<any[]>(`/activity/rooms/${roomId}/activity`);
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadRoom();
      await loadFilesAndFolders();
      await loadMembers();
      await loadActivities();
      setIsLoading(false);
    };
    init();
  }, [roomId]);

  useEffect(() => {
    loadFilesAndFolders();
  }, [currentFolderId]);

  // Navigate folder hierarchy
  const handleOpenFolder = (folder: any) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (idx: number) => {
    const target = folderPath[idx];
    setCurrentFolderId(target.id);
    setFolderPath((prev) => prev.slice(0, idx + 1));
  };

  // File Download
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await api.get<any>(`/files/${fileId}/download-url`);
      if (res.success && res.data?.downloadUrl) {
        success(`Downloading "${fileName}"...`);
        await downloadFileFromUrl(res.data.downloadUrl, fileName);
      }
    } catch (err: any) {
      error(err.message || 'Download forbidden');
    }
  };

  // Move File to Trash
  const handleMoveFileToTrash = async (fileId: string, fileName: string) => {
    try {
      const res = await api.patch(`/files/${fileId}`, { isTrash: true });
      if (res.success) {
        success(`Moved "${fileName}" to trash`, 'File Deleted');
        loadFilesAndFolders();
        loadRoom();
      }
    } catch (err: any) {
      error(err.message || 'Delete forbidden');
    }
  };

  // Member Role Change
  const handleChangeMemberRole = async (targetUserId: string, newRole: string) => {
    try {
      const res = await api.patch(`/rooms/${roomId}/members/${targetUserId}/role`, { role: newRole });
      if (res.success) {
        success(`Updated member role to ${newRole}`);
        loadMembers();
      }
    } catch (err: any) {
      error(err.message || 'Permission denied');
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this room?`)) return;
    try {
      const res = await api.delete(`/rooms/${roomId}/members/${targetUserId}`);
      if (res.success) {
        success(`Removed ${memberName} from room`);
        loadMembers();
      }
    } catch (err: any) {
      error(err.message || 'Permission denied');
    }
  };

  // Save Room Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await api.patch(`/rooms/${roomId}`, {
        name: editName,
        description: editDesc,
        color: editColor,
        privacy: editPrivacy,
      });
      if (res.success) {
        success('Room settings updated successfully!');
        loadRoom();
      }
    } catch (err: any) {
      error(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Delete Room Permanently
  const handleDeleteRoom = async () => {
    if (deleteConfirmName.trim() !== room?.name.trim()) {
      error('Confirmation name does not match room name');
      return;
    }

    try {
      const res = await api.delete(`/rooms/${roomId}`, {
        body: JSON.stringify({ confirmationName: deleteConfirmName }),
      });
      if (res.success) {
        success('Room permanently deleted');
        router.push('/rooms');
      }
    } catch (err: any) {
      error(err.message || 'Failed to delete room');
    }
  };

  const perms = room?.currentUserPermissions || {};
  const isOwnerOrManager = room?.currentUserRole === 'OWNER' || room?.currentUserRole === 'MANAGER';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Loading workspace room...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!room) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Top Breadcrumb & Room Header */}
      <div className="space-y-4">
        <Link
          href="/rooms"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Rooms</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0"
              style={{ backgroundColor: room.color || '#4F46E5' }}
            >
              <FolderKanban className="w-7 h-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white truncate">{room.name}</h1>
                <Badge variant={room.privacy === 'PRIVATE' ? 'primary' : 'secondary'}>
                  {room.privacy === 'PRIVATE' ? 'Private Room' : 'Invite Only'}
                </Badge>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-input border border-border text-emerald-400">
                  Role: {room.currentUserRole}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 max-w-2xl line-clamp-2">
                {room.description || 'Collaborative project space for document management and team coordination.'}
              </p>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive In-App Terminal */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTerminal(true)}
              className="bg-slate-900 border-emerald-500/40 text-emerald-400 hover:text-white hover:bg-slate-800 shadow-sm"
              title="Open Interactive Terminal Console"
            >
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span>Terminal</span>
            </Button>

            {/* RoomAI Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAiDrawer(true)}
              className="bg-gradient-to-r from-purple-950 to-indigo-950 border-primary/40 text-primary-light hover:text-white"
            >
              <Sparkles className="w-4 h-4 text-primary-light" />
              <span>Ask RoomAI</span>
            </Button>

            {perms.canUpload && (
              <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                <UploadCloud className="w-4 h-4" />
                <span>Upload File</span>
              </Button>
            )}

            {perms.canManageMembers && (
              <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4" />
                <span>Invite</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 5 Navigation Workspace Tabs */}
      <div className="flex border-b border-border gap-6">
        {[
          { key: 'overview', label: 'Overview', icon: FolderKanban },
          { key: 'files', label: `Files & Folders (${room.fileCount || 0})`, icon: FileText },
          { key: 'members', label: `Members (${room.memberCount || 1})`, icon: Users },
          { key: 'activity', label: 'Activity Log', icon: Activity },
          { key: 'settings', label: 'Settings & Security', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-primary text-primary-light'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ROOM OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Room KPI Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-card/70 border-border">
              <p className="text-xs text-muted uppercase font-semibold">Members</p>
              <p className="text-xl font-bold text-white mt-1">{room.memberCount || 1}</p>
            </Card>
            <Card className="p-4 bg-card/70 border-border">
              <p className="text-xs text-muted uppercase font-semibold">Files</p>
              <p className="text-xl font-bold text-white mt-1">{room.fileCount || 0}</p>
            </Card>
            <Card className="p-4 bg-card/70 border-border">
              <p className="text-xs text-muted uppercase font-semibold">Storage Used</p>
              <p className="text-xl font-bold text-white mt-1">{formatBytes(room.currentStorageBytes || '0')}</p>
            </Card>
            <Card className="p-4 bg-card/70 border-border">
              <p className="text-xs text-muted uppercase font-semibold">Audit Events</p>
              <p className="text-xl font-bold text-white mt-1">{activities.length}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Uploaded Files */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Latest Uploaded Files</h3>
                <button
                  onClick={() => setActiveTab('files')}
                  className="text-xs font-semibold text-primary-light hover:underline"
                >
                  Browse all files
                </button>
              </div>

              {files.length === 0 ? (
                <div className="p-8 rounded-xl bg-card border border-border border-dashed text-center space-y-3">
                  <FileText className="w-8 h-8 text-muted mx-auto opacity-50" />
                  <p className="text-xs text-muted">No documents uploaded yet in this room.</p>
                  {perms.canUpload && (
                    <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload First Document</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {files.slice(0, 5).map((f) => {
                    const typeInfo = getFileTypeInfo(f.extension);
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${typeInfo.bg} ${typeInfo.color}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text truncate max-w-sm">{f.name}</p>
                            <p className="text-[10px] text-muted">
                              {formatBytes(f.sizeBytes)} • Version {f.currentVersion} • By {f.uploader?.fullName || 'User'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPreviewFileId(f.id)}
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {perms.canDownload && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(f.id, f.originalName)}
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Room Members Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Active Members</h3>
                <button
                  onClick={() => setActiveTab('members')}
                  className="text-xs font-semibold text-primary-light hover:underline"
                >
                  Manage ({members.length})
                </button>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                {members.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.user?.fullName} src={m.user?.avatarUrl} size="sm" />
                      <div>
                        <p className="font-semibold text-text">{m.user?.fullName}</p>
                        <p className="text-[10px] text-muted">{m.user?.email}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-input text-slate-300 border border-border">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILES & FOLDERS */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Breadcrumb Navigation & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs font-medium overflow-x-auto">
              {folderPath.map((item, idx) => (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`hover:text-primary-light transition-colors whitespace-nowrap ${
                      idx === folderPath.length - 1 ? 'font-bold text-white' : 'text-muted'
                    }`}
                  >
                    {item.name}
                  </button>
                  {idx < folderPath.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>

            {/* Folder Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTerminal(true)}
                className="bg-slate-900 border-slate-700 text-slate-200 hover:text-white"
                title="Open Terminal in this directory"
              >
                <TerminalIcon className="w-4 h-4 text-emerald-400" />
                <span>Terminal</span>
              </Button>

              {perms.canUpload && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setShowFolderModal(true)}>
                    <FolderPlus className="w-4 h-4" />
                    <span>New Folder</span>
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload File</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Folders Grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card-hover transition-all group"
                >
                  <div
                    onClick={() => handleOpenFolder(f)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <FolderIcon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-xs font-semibold text-text truncate">{f.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLauncherFolder(f);
                    }}
                    title="Open Folder with VS Code, AI Agents, or Local Live Sync"
                    className="p-1 rounded text-muted hover:text-cyan-400 hover:bg-slate-800 transition-colors ml-1 flex-shrink-0"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Files Table */}
          {files.length === 0 && folders.length === 0 ? (
            <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-3">
              <UploadCloud className="w-12 h-12 text-muted mx-auto opacity-40" />
              <div>
                <h3 className="font-bold text-base text-text">No documents in this directory</h3>
                <p className="text-xs text-muted mt-1">Upload documents to collaborate with team members.</p>
              </div>
              {perms.canUpload && (
                <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Document</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Document Name</th>
                      <th className="p-3.5">Size</th>
                      <th className="p-3.5">Version</th>
                      <th className="p-3.5">Uploaded By</th>
                      <th className="p-3.5">Modified</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {files.map((file) => {
                      const typeInfo = getFileTypeInfo(file.extension);
                      return (
                        <tr key={file.id} className="hover:bg-card-hover/60 transition-colors">
                          <td className="p-3.5">
                            <div
                              onClick={() => handleOpenWithApp(file)}
                              className="flex items-center gap-2.5 cursor-pointer group"
                              title="Click to choose application to open and edit"
                            >
                              <div className={`p-1.5 rounded-lg ${typeInfo.bg} ${typeInfo.color}`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-text truncate max-w-xs group-hover:text-primary-light transition-colors">
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-muted font-mono">{formatBytes(file.sizeBytes)}</td>
                          <td className="p-3.5">
                            <button
                              onClick={() => setVersionFile(file)}
                              className="px-2 py-0.5 rounded bg-input hover:bg-card border border-border text-slate-300 hover:text-primary-light font-mono text-[10px] transition-colors"
                            >
                              v{file.currentVersion} ({file.versionsCount || 1})
                            </button>
                          </td>
                          <td className="p-3.5 text-slate-300">{file.uploader?.fullName || 'User'}</td>
                          <td className="p-3.5 text-muted">{formatDate(file.updatedAt)}</td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open In App (PowerPoint, Word, VS Code, Google Docs, Office Online) */}
                              <button
                                onClick={() => handleOpenWithApp(file)}
                                title="Open Document With App (PowerPoint, Word, VS Code, Office 365, Google Docs)"
                                className="p-1.5 rounded hover:bg-primary/20 text-muted hover:text-primary-light transition-colors"
                              >
                                <Laptop className="w-3.5 h-3.5" />
                              </button>

                              {/* Preview */}
                              <button
                                onClick={() => setPreviewFileId(file.id)}
                                title="Quick Preview"
                                className="p-1.5 rounded hover:bg-card text-muted hover:text-white transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Download */}
                              {perms.canDownload && (
                                <button
                                  onClick={() => handleDownloadFile(file.id, file.originalName)}
                                  title="Download File"
                                  className="p-1.5 rounded hover:bg-card text-muted hover:text-emerald-400 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Comments */}
                              <button
                                onClick={() => setCommentsFile(file)}
                                title="Comments & Feedback"
                                className="p-1.5 rounded hover:bg-card text-muted hover:text-indigo-400 transition-colors relative"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {file.commentsCount > 0 && (
                                  <span className="absolute -top-1 -right-1 px-1 rounded-full bg-primary text-[8px] font-bold text-white">
                                    {file.commentsCount}
                                  </span>
                                )}
                              </button>

                              {/* Version History */}
                              <button
                                onClick={() => setVersionFile(file)}
                                title="Version History"
                                className="p-1.5 rounded hover:bg-card text-muted hover:text-purple-400 transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete to Trash */}
                              {perms.canDelete && (
                                <button
                                  onClick={() => handleMoveFileToTrash(file.id, file.name)}
                                  title="Move to Trash"
                                  className="p-1.5 rounded hover:bg-rose-500/10 text-muted hover:text-danger transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEMBERS & RBAC */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
            <div>
              <h3 className="font-bold text-sm text-white">Workspace Members & Permissions</h3>
              <p className="text-xs text-muted">
                Manage roles (Owner, Manager, Editor, Viewer) and assign custom 10-point permissions.
              </p>
            </div>
            {perms.canManageMembers && (
              <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4" />
                <span>Invite New Member</span>
              </Button>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Member</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5">Last Active</th>
                    <th className="p-3.5">Granular Permissions</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-card-hover/60 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.user.fullName} src={m.user.avatarUrl} size="sm" />
                          <div>
                            <p className="font-bold text-text">{m.user.fullName}</p>
                            <p className="text-[11px] text-muted">{m.user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {isOwnerOrManager && m.role !== 'OWNER' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeMemberRole(m.userId, e.target.value)}
                            className="bg-input border border-border rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary"
                          >
                            <option value="MANAGER">MANAGER</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <Badge variant={m.role === 'OWNER' ? 'primary' : 'default'}>{m.role}</Badge>
                        )}
                      </td>

                      <td className="p-3.5 text-muted">{formatDate(m.joinedAt)}</td>
                      <td className="p-3.5 text-muted">{formatDate(m.lastActiveAt)}</td>

                      <td className="p-3.5">
                        {m.role === 'OWNER' ? (
                          <span className="text-[11px] text-emerald-400 font-semibold">Full Control (Owner)</span>
                        ) : isOwnerOrManager ? (
                          <button
                            onClick={() => setSelectedMemberForPerms(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-input hover:bg-card border border-border text-xs text-primary-light hover:text-white transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Customize Permissions</span>
                          </button>
                        ) : (
                          <span className="text-muted text-[11px]">Role Defaults Applied</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        {isOwnerOrManager && m.role !== 'OWNER' && m.userId !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(m.userId, m.user.fullName)}
                            className="p-1.5 text-muted hover:text-danger hover:bg-rose-500/10 rounded transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY AUDIT LOG */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-bold text-sm text-white">Security & Audit Event Log</h3>
            <p className="text-xs text-muted">
              Immutable chronological record of all file uploads, downloads, member role modifications, and room updates.
            </p>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-muted text-center py-12">No activity events recorded yet.</p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border text-xs"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary-light flex-shrink-0">
                    {act.user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-text">
                        {act.user?.fullName}{' '}
                        <span className="font-normal text-muted">
                          {act.action === 'FILE_UPLOADED' && 'uploaded a new document'}
                          {act.action === 'FILE_DOWNLOADED' && 'downloaded document via signed URL'}
                          {act.action === 'MEMBER_INVITED' && 'sent an invitation'}
                          {act.action === 'MEMBER_JOINED' && 'joined the workspace'}
                          {act.action === 'MEMBER_REMOVED' && 'removed a member'}
                          {act.action === 'PERMISSION_CHANGED' && 'modified role / custom permissions'}
                          {act.action === 'COMMENT_ADDED' && 'commented on a file'}
                          {act.action === 'ROOM_SETTINGS_CHANGED' && 'updated room settings'}
                          {!['FILE_UPLOADED', 'FILE_DOWNLOADED', 'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_REMOVED', 'PERMISSION_CHANGED', 'COMMENT_ADDED', 'ROOM_SETTINGS_CHANGED'].includes(act.action) && act.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </p>
                      <span className="text-[10px] text-muted-dark font-mono">{formatDate(act.createdAt)}</span>
                    </div>

                    {act.details?.name && (
                      <p className="text-[11px] text-primary-light mt-1 font-mono">📄 {act.details.name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ROOM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-card border border-border space-y-5">
            <h3 className="font-bold text-base text-white">Workspace Properties</h3>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Room Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isOwnerOrManager}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  disabled={!isOwnerOrManager}
                  className="w-full bg-input border border-border rounded-lg p-3 text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>

              {isOwnerOrManager && (
                <Button type="submit" variant="primary" isLoading={isSavingSettings}>
                  Save Room Settings
                </Button>
              )}
            </div>
          </form>

          {/* Danger Zone: Delete Room */}
          {room.currentUserRole === 'OWNER' && (
            <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone: Delete Room</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                Permanently deletes this collaborative workspace, associated folder hierarchies, and all cloud document versions stored on AWS S3. This action is irreversible.
              </p>

              <div className="space-y-2 max-w-md pt-2">
                <label className="text-xs text-muted block">
                  Please type <strong className="text-rose-300">{room.name}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={room.name}
                  className="w-full bg-input border border-rose-500/40 rounded-lg px-3 py-2 text-xs text-rose-100 focus:outline-none focus:border-rose-500"
                />
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteRoom}
                  disabled={deleteConfirmName.trim() !== room.name.trim()}
                >
                  Permanently Delete This Workspace
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALL ATTACHED MODALS & DRAWERS */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
        roomName={room.name}
      />

      <FileUploaderModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        roomId={roomId}
        folderId={currentFolderId}
        onUploadSuccess={() => {
          loadFilesAndFolders();
          loadRoom();
        }}
      />

      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        roomId={roomId}
        parentId={currentFolderId}
        onFolderCreated={loadFilesAndFolders}
      />

      <FilePreviewModal
        isOpen={!!previewFileId}
        onClose={() => setPreviewFileId(null)}
        fileId={previewFileId}
        onOpenWith={(f, url) => {
          setOpenWithFile(f);
          setOpenWithDownloadUrl(url || null);
        }}
      />

      <OpenWithModal
        isOpen={!!openWithFile}
        onClose={() => {
          setOpenWithFile(null);
          setOpenWithDownloadUrl(null);
        }}
        file={openWithFile}
        downloadUrl={openWithDownloadUrl}
        userRole={room?.currentUserRole || 'EDITOR'}
        onOpenInAppPreview={(fileId) => setPreviewFileId(fileId)}
      />

      {launcherFolder && (
        <FolderLauncherModal
          isOpen={!!launcherFolder}
          onClose={() => setLauncherFolder(null)}
          folderName={launcherFolder.name}
          roomId={roomId}
          userRole={room?.currentUserRole || 'EDITOR'}
          onNavigateIntoFolder={() => handleOpenFolder(launcherFolder)}
        />
      )}

      <VersionHistoryModal
        isOpen={!!versionFile}
        onClose={() => setVersionFile(null)}
        file={versionFile}
        onVersionRestored={() => {
          loadFilesAndFolders();
          loadRoom();
        }}
      />

      <CommentsDrawer
        isOpen={!!commentsFile}
        onClose={() => setCommentsFile(null)}
        file={commentsFile}
      />

      {selectedMemberForPerms && (
        <PermissionMatrixModal
          isOpen={!!selectedMemberForPerms}
          onClose={() => setSelectedMemberForPerms(null)}
          roomId={roomId}
          member={selectedMemberForPerms}
          onUpdated={loadMembers}
        />
      )}

      <RoomAIChatDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        roomId={roomId}
        roomName={room.name}
      />

      <RoomTerminalDrawer
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        roomId={roomId}
        roomName={room?.name || 'Workspace'}
        initialFolderId={currentFolderId}
        onWorkspaceMutated={() => {
          loadFilesAndFolders();
          loadRoom();
        }}
      />
    </div>
    </DashboardLayout>
  );
}
