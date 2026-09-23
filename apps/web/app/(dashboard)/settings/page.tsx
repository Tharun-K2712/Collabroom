'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Bell, Shield, Monitor, Globe, Laptop, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { success } = useToast();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [socketNotifs, setSocketNotifs] = useState(true);
  const [sessionTerminated, setSessionTerminated] = useState(false);

  const handleSave = () => {
    success('Workspace preferences updated successfully');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Workspace Preferences</h1>
        <p className="text-xs text-muted mt-1">Configure your real-time notification feeds and active session security.</p>
      </div>

      {/* Notification Preferences */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Bell className="w-5 h-5 text-primary-light" />
          <h2 className="font-bold text-sm text-white">Notification Feeds</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-input/40 border border-border cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-text">Real-time Socket Alerts</p>
              <p className="text-[11px] text-muted">Receive live notifications for file uploads and comments in open rooms.</p>
            </div>
            <input
              type="checkbox"
              checked={socketNotifs}
              onChange={(e) => setSocketNotifs(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-input/40 border border-border cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-text">Email Invitations & Summary</p>
              <p className="text-[11px] text-muted">Receive email digests when invited to new collaborative workspaces.</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Session Management */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Monitor className="w-5 h-5 text-primary-light" />
          <h2 className="font-bold text-sm text-white">Active Device Sessions</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-input/40 border border-primary/40">
            <div className="flex items-center gap-3">
              <Laptop className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-text">Current Browser Session</p>
                <p className="text-[10px] text-muted">Windows / Chrome • Active Now</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              This Device
            </span>
          </div>

          {!sessionTerminated && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-input/40 border border-border">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-text">Mobile App Session</p>
                  <p className="text-[10px] text-muted">Android 14 • Last active 2 hours ago</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSessionTerminated(true);
                  success('Revoked remote session');
                }}
                className="text-xs text-danger hover:underline"
              >
                Revoke
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
