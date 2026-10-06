'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Star,
  Trash2,
  Bell,
  Settings,
  User,
  Shield,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../providers/AuthProvider';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const mainLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Rooms', href: '/rooms?filter=owned', icon: FolderKanban },
    { label: 'Shared With Me', href: '/rooms?filter=shared', icon: Users },
    { label: 'Recent Files', href: '/files', icon: FileText },
    { label: 'Favorites', href: '/favorites', icon: Star },
    { label: 'Trash', href: '/trash', icon: Trash2 },
  ];

  const bottomLinks = [
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  if (user?.systemRole === 'ADMIN') {
    bottomLinks.unshift({ label: 'Admin Panel', href: '/admin', icon: Shield });
  }

  const isActive = (href: string) => {
    return pathname.startsWith(href.split('?')[0]);
  };

  return (
    <aside className="w-64 bg-[#0B132B]/80 border-r border-border flex flex-col h-screen fixed left-0 top-0 z-30 select-none backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-6 border-b border-border/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-tight leading-none">
            Collab<span className="text-primary-light">Room</span>
          </h1>
          <p className="text-[11px] text-muted font-medium mt-1">Workspace & Cloud</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
        <p className="text-[10px] font-bold text-muted/70 tracking-wider uppercase px-3 mb-2">
          Workspace
        </p>
        {mainLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted hover:text-white hover:bg-card/70'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-muted')} />
              <span>{link.label}</span>
            </Link>
          );
        })}

        <div className="pt-6">
          <p className="text-[10px] font-bold text-muted/70 tracking-wider uppercase px-3 mb-2">
            System & Account
          </p>
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-muted hover:text-white hover:bg-card/70'
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-muted')} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-border/60 bg-card/40">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 min-w-0 group">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-primary-light flex-shrink-0">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text truncate group-hover:text-primary-light transition-colors">
                {user?.fullName || 'User'}
              </p>
              <p className="text-[11px] text-muted truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={() => logout()}
            title="Logout"
            className="p-2 text-muted hover:text-danger hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
