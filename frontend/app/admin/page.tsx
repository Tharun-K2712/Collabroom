'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { Shield, Users, FolderKanban, FileText, HardDrive, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AdminPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'rooms'>('users');
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, roomsRes] = await Promise.all([
        api.get<any>('/admin/stats'),
        api.get<any[]>('/admin/users'),
        api.get<any[]>('/admin/rooms'),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (usersRes.success && usersRes.data) setUsersList(usersRes.data);
      if (roomsRes.success && roomsRes.data) setRoomsList(roomsRes.data);
    } catch (err: any) {
      error(err.message || 'Failed to load admin telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (targetUserId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.patch(`/admin/users/${targetUserId}/status`, { status: newStatus });
      if (res.success) {
        success(`User status updated to ${newStatus}`);
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err: any) {
      error(err.message || 'Status update failed');
    }
  };

  if (user?.systemRole !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <Shield className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Administrative Access Required</h2>
          <p className="text-xs text-muted">You do not have system administration privileges.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">System Admin Panel</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary-light border border-primary/40">
              Superadmin
            </span>
          </div>
          <p className="text-xs text-muted mt-1">Platform-wide telemetry, user management, and room supervision.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/80 border-border">
          <p className="text-xs font-semibold text-muted uppercase">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.totalUsers || 0}</p>
        </Card>

        <Card className="p-4 bg-card/80 border-border">
          <p className="text-xs font-semibold text-muted uppercase">Total Workspaces</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.totalRooms || 0}</p>
        </Card>

        <Card className="p-4 bg-card/80 border-border">
          <p className="text-xs font-semibold text-muted uppercase">Total Documents</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.totalFiles || 0}</p>
        </Card>

        <Card className="p-4 bg-card/80 border-border">
          <p className="text-xs font-semibold text-muted uppercase">Storage Utilized</p>
          <p className="text-2xl font-bold text-white mt-1">{formatBytes(stats?.totalStorageBytes || '0')}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'users' ? 'border-primary text-primary-light' : 'border-transparent text-muted'
          }`}
        >
          All Users ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'rooms' ? 'border-primary text-primary-light' : 'border-transparent text-muted'
          }`}
        >
          All Workspaces ({roomsList.length})
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Loading system records...</p>
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Storage Used</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-card-hover/60 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-text">{u.fullName}</p>
                      <p className="text-[11px] text-muted">{u.email}</p>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.systemRole === 'ADMIN' ? 'primary' : 'default'}>
                        {u.systemRole}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-muted">{formatBytes(u.storageUsedBytes)}</td>
                    <td className="p-3.5 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="p-3.5 text-right">
                      {u.id !== user?.id && (
                        <Button
                          variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Workspace</th>
                  <th className="p-3.5">Owner</th>
                  <th className="p-3.5">Privacy</th>
                  <th className="p-3.5">Members</th>
                  <th className="p-3.5">Files</th>
                  <th className="p-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {roomsList.map((r) => (
                  <tr key={r.id} className="hover:bg-card-hover/60 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-text">{r.name}</p>
                      <p className="text-[11px] text-muted truncate max-w-xs">{r.description || 'No description'}</p>
                    </td>
                    <td className="p-3.5 text-slate-300">{r.owner?.fullName || 'User'}</td>
                    <td className="p-3.5">
                      <Badge variant={r.privacy === 'PRIVATE' ? 'primary' : 'secondary'}>{r.privacy}</Badge>
                    </td>
                    <td className="p-3.5 text-muted">{r.memberCount || 1}</td>
                    <td className="p-3.5 text-muted">{r.fileCount || 0}</td>
                    <td className="p-3.5 text-muted">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
