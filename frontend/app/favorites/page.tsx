'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { Star, FolderKanban, FileText, Loader2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<any[]>('/favorites');
        if (res.success && res.data) {
          setFavorites(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFavorites();
  }, []);

  const favoriteRooms = favorites.filter((f) => f.room && !f.fileId && !f.folderId);
  const favoriteFiles = favorites.filter((f) => f.file);

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Starred & Favorites</h1>
        <p className="text-xs text-muted mt-1">
          Quickly access your bookmarked workspaces and important documents.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Loading your favorites...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-2">
          <Star className="w-10 h-10 text-muted mx-auto opacity-40" />
          <p className="font-semibold text-sm text-text">No favorites saved yet</p>
          <p className="text-xs text-muted">Click the star icon on any workspace or file to pin it here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Starred Rooms */}
          {favoriteRooms.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-sm text-white">Favorite Workspaces</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteRooms.map((fav) => (
                  <Link key={fav.id} href={`/rooms/${fav.room.id}`}>
                    <Card className="hover:border-primary/50 transition-all flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: fav.room.color || '#4F46E5' }}
                        >
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-text truncate">{fav.room.name}</p>
                          <p className="text-xs text-muted truncate">{fav.room.description || 'Workspace'}</p>
                        </div>
                      </div>
                      <Star className="w-4 h-4 text-amber-400 fill-current flex-shrink-0" />
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Starred Files */}
          {favoriteFiles.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-sm text-white">Favorite Documents</h2>
              <div className="space-y-2">
                {favoriteFiles.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-text">{fav.file.name}</p>
                        <p className="text-[10px] text-muted">
                          Workspace: {fav.file.room?.name} • {formatBytes(fav.file.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/rooms/${fav.file.roomId}?fileId=${fav.file.id}`}
                      className="text-xs font-semibold text-primary-light hover:underline"
                    >
                      Open in Room →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
