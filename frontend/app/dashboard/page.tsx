'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { api } from '@/lib/api';
import { formatBytes, formatDate, getFileTypeInfo } from '@/lib/utils';
import {
  FolderKanban,
  FileText,
  Users,
  HardDrive,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  Download,
  Eye,
  MoreVertical,
  Activity,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch User Rooms
      const roomsRes = await api.get<any[]>('/rooms');
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }

      // 2. Fetch User Activities
      const actRes = await api.get<any[]>('/activity/user/activity?limit=8');
      if (actRes.success && actRes.data) {
        setRecentActivities(actRes.data);
      }

      // 3. Search or collect recent files
      const searchRes = await api.get<any>('/search?q= ');
      if (searchRes.success && searchRes.data?.files) {
        setRecentFiles(searchRes.data.files.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute aggregated KPI stats
  const totalRoomsCount = rooms.length;
  const totalFilesCount = rooms.reduce((acc, r) => acc + (r.fileCount || 0), 0);
  const totalMembersCount = rooms.reduce((acc, r) => acc + (r.memberCount || 1), 0);
  const storageUsed = user?.storageUsedBytes || '0';

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Welcome Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {getTimeGreeting()}, {user?.fullName?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Here is what is happening across your collaborative workspaces today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setShowCreateRoom(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            <span>Create New Room</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4 p-5 bg-card/80 border-border">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Rooms</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalRoomsCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 bg-card/80 border-border">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Files</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalFilesCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 bg-card/80 border-border">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Team Members</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalMembersCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 bg-card/80 border-border">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Storage Used</p>
            <p className="text-2xl font-bold text-white mt-0.5">{formatBytes(storageUsed)}</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Recent Rooms & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Rooms & Recent Files */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Rooms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Your Collaborative Rooms</h2>
              <Link
                href="/rooms"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-light hover:underline"
              >
                <span>View All ({rooms.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card border border-border border-dashed text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-muted mx-auto opacity-50" />
                <div>
                  <h3 className="font-semibold text-text text-sm">You haven't created any rooms yet</h3>
                  <p className="text-xs text-muted mt-1">Create your first collaborative workspace to get started.</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowCreateRoom(true)}>
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.slice(0, 4).map((r) => (
                  <Link key={r.id} href={`/rooms/${r.id}`}>
                    <Card className="h-full flex flex-col justify-between hover:border-primary/50 transition-all group">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                            style={{ backgroundColor: r.color || '#4F46E5' }}
                          >
                            <FolderKanban className="w-5 h-5 text-white" />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-input border border-border text-muted">
                            {r.currentUserRole || 'MEMBER'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-text group-hover:text-primary-light transition-colors truncate">
                            {r.name}
                          </h3>
                          <p className="text-xs text-muted line-clamp-2 mt-1">
                            {r.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                        <span>{r.memberCount || 1} Members</span>
                        <span>{r.fileCount || 0} Files</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Files Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Recent Documents</h2>
              <Link
                href="/files"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-light hover:underline"
              >
                <span>All Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentFiles.length === 0 ? (
              <div className="p-6 rounded-xl bg-card border border-border text-center text-xs text-muted">
                No recent files uploaded yet.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                      <tr>
                        <th className="p-3.5">Document</th>
                        <th className="p-3.5">Workspace</th>
                        <th className="p-3.5">Size</th>
                        <th className="p-3.5">Uploaded By</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentFiles.map((f) => {
                        const typeInfo = getFileTypeInfo(f.extension);
                        return (
                          <tr key={f.id} className="hover:bg-card-hover/60 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg ${typeInfo.bg} ${typeInfo.color}`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-text truncate max-w-[180px]">
                                  {f.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-muted">{f.roomName}</td>
                            <td className="p-3.5 text-muted font-mono">{formatBytes(f.sizeBytes)}</td>
                            <td className="p-3.5 text-slate-300">{f.uploaderName || 'Member'}</td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setPreviewFileId(f.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-input hover:bg-card border border-border text-xs text-slate-200 hover:text-white transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
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
        </div>

        {/* Right Col: Live Activity Stream & Security Highlights */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-light" />
                <h3 className="font-bold text-sm text-text">Workspace Activity</h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">No recent activity logged.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-[10px] text-primary-light flex-shrink-0 mt-0.5">
                      {act.user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text leading-tight">
                        <strong className="text-white">{act.user?.fullName || 'User'}</strong>{' '}
                        <span className="text-muted">
                          {act.action === 'FILE_UPLOADED' && 'uploaded a document'}
                          {act.action === 'MEMBER_JOINED' && 'joined workspace'}
                          {act.action === 'ROOM_CREATED' && 'created room'}
                          {act.action === 'COMMENT_ADDED' && 'commented on document'}
                          {act.action === 'PERMISSION_CHANGED' && 'updated permissions'}
                          {!['FILE_UPLOADED', 'MEMBER_JOINED', 'ROOM_CREATED', 'COMMENT_ADDED', 'PERMISSION_CHANGED'].includes(act.action) && act.action.toLowerCase().replace('_', ' ')}
                        </span>
                      </p>
                      {act.details?.name && (
                        <p className="text-[11px] text-primary-light font-medium truncate mt-0.5">
                          📄 {act.details.name}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-dark mt-0.5">{formatDate(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Security Badge Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary-light font-bold text-xs">
              <Shield className="w-4 h-4" />
              <span>Zero-Trust Cloud Encryption</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Files are stored on AWS S3 using temporary pre-signed URLs. Direct access without active room credentials is unconditionally blocked.
            </p>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreated={(room) => {
          setShowCreateRoom(false);
          loadDashboardData();
        }}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFileId}
        onClose={() => setPreviewFileId(null)}
        fileId={previewFileId}
      />
    </div>
    </DashboardLayout>
  );
}
