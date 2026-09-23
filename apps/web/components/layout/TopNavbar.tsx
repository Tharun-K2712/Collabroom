'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, HardDrive, Plus, X, FolderKanban, FileText } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { formatBytes } from '@/lib/utils';
import { api } from '@/lib/api';
import { CreateRoomModal } from '../rooms/CreateRoomModal';

export const TopNavbar: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ rooms: any[]; files: any[]; folders: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get<any>(`/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      <header className="h-16 border-b border-border bg-[#0B132B]/50 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8 ml-64">
        {/* Search Bar */}
        <div className="relative w-96" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms, files, folders..."
              className="w-full bg-input/80 border border-border/80 rounded-lg pl-9 pr-8 py-1.5 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {searchResults && (
            <div className="absolute top-11 left-0 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-border/50 bg-card/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Search Results
                </span>
                {isSearching && <span className="text-xs text-primary animate-pulse">Searching...</span>}
              </div>

              {/* Rooms */}
              {searchResults.rooms.length > 0 && (
                <div className="p-2 border-b border-border/40">
                  <p className="text-[10px] font-bold text-muted uppercase px-2 mb-1">Rooms</p>
                  {searchResults.rooms.map((r) => (
                    <Link
                      key={r.id}
                      href={`/rooms/${r.id}`}
                      onClick={() => setSearchQuery('')}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-card-hover text-sm text-text transition-colors"
                    >
                      <FolderKanban className="w-4 h-4 text-primary-light flex-shrink-0" />
                      <span className="truncate">{r.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Files */}
              {searchResults.files.length > 0 && (
                <div className="p-2 border-b border-border/40">
                  <p className="text-[10px] font-bold text-muted uppercase px-2 mb-1">Files</p>
                  {searchResults.files.map((f) => (
                    <Link
                      key={f.id}
                      href={`/rooms/${f.roomId}?fileId=${f.id}`}
                      onClick={() => setSearchQuery('')}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-card-hover text-sm text-text transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                      <span className="text-xs text-muted ml-2">{formatBytes(f.sizeBytes)}</span>
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.rooms.length === 0 && searchResults.files.length === 0 && (
                <div className="p-6 text-center text-sm text-muted">
                  No matching files or rooms found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-4">
          {/* Storage Quota */}
          {(() => {
            const usedBytes = Number(user?.storageUsedBytes || 0);
            const totalBytes = 10 * 1024 * 1024 * 1024; // 10 GB
            const pct = Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
            const barColor = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-primary-light';
            return (
              <div
                className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card/70 border border-border text-xs text-muted shadow-sm hover:border-primary/40 transition-colors"
                title={`${formatBytes(usedBytes)} of 10 GB used (${pct < 0.1 && usedBytes > 0 ? '<0.1%' : pct.toFixed(1) + '%'})`}
              >
                <HardDrive className="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
                <div className="flex flex-col gap-1 min-w-[100px]">
                  <div className="flex items-center justify-between text-[11px] leading-none">
                    <span className="font-semibold text-slate-200">
                      {formatBytes(usedBytes)}
                    </span>
                    <span className="text-[10px] text-muted font-medium ml-1">/ 10 GB</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.max(usedBytes > 0 ? 2 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Create Room Button */}
          <button
            onClick={() => setShowCreateRoom(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Room</span>
          </button>

          {/* Notifications Link */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-muted hover:text-white hover:bg-card/70 border border-transparent hover:border-border transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
          </Link>

          {/* User Profile */}
          <Link href="/profile" className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-xs text-white shadow-md">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
          </Link>
        </div>
      </header>

      {/* Quick Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreated={(room) => {
          setShowCreateRoom(false);
          router.push(`/rooms/${room.id}`);
        }}
      />
    </>
  );
};
