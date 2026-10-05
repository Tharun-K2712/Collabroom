'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api } from '@/lib/api';
import { Mail, Link2, Copy, Check, Shield, UserCheck } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, roomId, roomName }) => {
  const { success, error } = useToast();
  const [tab, setTab] = useState<'email' | 'link'>('email');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post(`/rooms/${roomId}/invitations`, {
        email: email.trim(),
        role,
      });

      if (res.success) {
        success(`Invitation successfully sent to ${email}`, 'Invitation Sent');
        setEmail('');
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const res = await api.post<any>(`/rooms/${roomId}/invite-links`, {
        defaultRole: role,
        expiresInHours: 168, // 7 days
      });

      if (res.success && res.data) {
        const fullUrl = `${window.location.origin}${res.data.inviteUrl}`;
        setGeneratedLink(fullUrl);
      }
    } catch (err: any) {
      error(err.message || 'Failed to generate invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite to "${roomName}"`}
      description="Invite team members to collaborate, view, or manage files in this workspace."
    >
      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        <button
          type="button"
          onClick={() => setTab('email')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
            tab === 'email'
              ? 'border-primary text-primary-light font-semibold'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Invite by Email</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('link')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
            tab === 'link'
              ? 'border-primary text-primary-light font-semibold'
              : 'border-transparent text-muted hover:text-white'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Shareable Link</span>
        </button>
      </div>

      {tab === 'email' ? (
        <form onSubmit={handleSendEmailInvite} className="space-y-4">
          <Input
            label="Member Email Address"
            type="email"
            placeholder="colleague@organization.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Assigned Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('VIEWER')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'VIEWER'
                    ? 'border-primary bg-primary/15 text-white ring-1 ring-primary'
                    : 'border-border bg-card/60 text-muted hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👁️</span>
                  <p className="text-xs font-bold text-slate-100">View Only</p>
                </div>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Teammates can view inline documents, preview, and download files.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('EDITOR')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'EDITOR'
                    ? 'border-primary bg-primary/15 text-white ring-1 ring-primary'
                    : 'border-border bg-card/60 text-muted hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">✏️</span>
                  <p className="text-xs font-bold text-slate-100">View & Edit</p>
                </div>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Teammates can edit documents with autosave and upload revisions.
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} disabled={!email.trim()}>
              Send Secure Invitation
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Default Access for Link</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('VIEWER')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'VIEWER'
                    ? 'border-primary bg-primary/15 text-white ring-1 ring-primary'
                    : 'border-border bg-card/60 text-muted hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">👁️</span>
                  <p className="text-xs font-bold text-slate-100">View Only</p>
                </div>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Anyone with the link can view and download files.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('EDITOR')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'EDITOR'
                    ? 'border-primary bg-primary/15 text-white ring-1 ring-primary'
                    : 'border-border bg-card/60 text-muted hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">✏️</span>
                  <p className="text-xs font-bold text-slate-100">View & Edit</p>
                </div>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  Anyone with the link can edit documents with autosave.
                </p>
              </button>
            </div>
          </div>

          {generatedLink ? (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-slate-300">Invite Link (Valid for 7 days)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-text truncate"
                />
                <Button type="button" variant="primary" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                onClick={handleGenerateLink}
              >
                Generate Shareable Invite Link
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
