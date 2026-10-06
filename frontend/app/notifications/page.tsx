'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils';
import { Bell, CheckCheck, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function NotificationsPage() {
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any[]>('/notifications');
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        success('All notifications marked as read');
      }
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Notifications Center</h1>
          <p className="text-xs text-muted mt-1">
            Real-time updates regarding workspace invites, uploads, and role adjustments.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Fetching notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-2">
          <Bell className="w-10 h-10 text-muted mx-auto opacity-40" />
          <p className="font-semibold text-sm text-text">You're all caught up!</p>
          <p className="text-xs text-muted">No new notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkOneRead(n.id)}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                n.isRead
                  ? 'bg-card/40 border-border opacity-75'
                  : 'bg-card border-primary/40 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-slate-700' : 'bg-primary'}`} />
                <div>
                  <h3 className="font-bold text-xs text-text">{n.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted mt-1.5">{formatDate(n.createdAt)}</p>
                </div>
              </div>

              {n.link && (
                <Link
                  href={n.link}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-light hover:underline mt-1"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
