'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  FileText,
  Star,
  Lock,
  Globe,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { useToast } from '@/components/providers/ToastProvider';

function RoomsContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as 'owned' | 'shared' | 'all') || 'all';
  const { success, error } = useToast();

  const [rooms, setRooms] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>(initialFilter);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      let query = `/rooms?filter=${filter}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      const res = await api.get<any[]>(query);
      if (res.success && res.data) {
        setRooms(res.data);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filter, search]);

  const handleToggleFavorite = async (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post<any>(`/favorites/rooms/${roomId}`);
      if (res.success) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, isFavorite: res.data?.isFavorite } : r))
        );
        success(res.data?.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (err: any) {
      error(err.message || 'Failed to update favorite');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Collaborative Rooms</h1>
          <p className="text-xs text-muted mt-1">
            Isolated team workspaces with granular role-based permissions and cloud file storage.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateRoom(true)} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          <span>Create New Room</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['all', 'owned', 'shared'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-input/60 text-muted hover:text-white hover:bg-input'
              }`}
            >
              {f === 'all' && 'All Workspaces'}
              {f === 'owned' && 'Created by Me'}
              {f === 'shared' && 'Shared with Me'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Loading collaborative workspaces...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-4">
          <FolderKanban className="w-12 h-12 text-muted mx-auto opacity-40" />
          <div>
            <h3 className="font-bold text-base text-text">No workspaces found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {search
                ? `No rooms match your search query "${search}".`
                : filter === 'owned'
                ? "You haven't created any rooms yet."
                : filter === 'shared'
                ? "No rooms have been shared with you yet."
                : 'Create your first collaborative room to begin.'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreateRoom(true)}>
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="group">
              <Card className="h-full flex flex-col justify-between hover:border-primary/50 transition-all">
                <div className="space-y-4">
                  {/* Top line with Icon, Privacy, Role, Favorite */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: room.color || '#4F46E5' }}
                    >
                      <FolderKanban className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-input border border-border text-slate-300">
                        {room.privacy === 'PRIVATE' ? (
                          <Lock className="w-3 h-3 text-primary-light" />
                        ) : (
                          <Globe className="w-3 h-3 text-secondary-light" />
                        )}
                        <span>{room.currentUserRole || 'MEMBER'}</span>
                      </span>

                      <button
                        onClick={(e) => handleToggleFavorite(e, room.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          room.isFavorite
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'border-transparent text-muted hover:text-white hover:bg-input'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Name & Description */}
                  <div>
                    <h3 className="font-bold text-base text-text group-hover:text-primary-light transition-colors line-clamp-1">
                      {room.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 mt-1.5 leading-relaxed">
                      {room.description || 'Secure collaborative room with document management.'}
                    </p>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary-light" />
                      {room.memberCount || 1}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      {room.fileCount || 0}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-dark">{formatDate(room.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreated={(newRoom) => {
          setShowCreateRoom(false);
          fetchRooms();
        }}
      />
    </div>
  );
}

export default function RoomsPage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-muted py-12">Loading workspaces...</div>}>
      <RoomsContent />
    </Suspense>
  );
}
