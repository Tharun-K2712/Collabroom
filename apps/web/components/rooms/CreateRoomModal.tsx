'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api } from '@/lib/api';
import { Lock, Globe, Shield } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (room: any) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#4F46E5');
  const [privacy, setPrivacy] = useState<'PRIVATE' | 'INVITE_ONLY'>('PRIVATE');
  const [isLoading, setIsLoading] = useState(false);

  const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#DB2777'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post<any>('/rooms', {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        privacy,
      });

      if (res.success && res.data) {
        success('Room created successfully', 'Room Created');
        setName('');
        setDescription('');
        onCreated(res.data);
      }
    } catch (err: any) {
      error(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Collaborative Room"
      description="Create a secure workspace to collaborate on documents and invite team members."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room Name"
          placeholder="e.g. AI Research Team, Startup Deck, Final Year Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs font-medium text-slate-300">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this workspace for? Outline goals, scope, and key deliverables..."
            className="w-full bg-input border border-border rounded-lg p-3 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="text-xs font-medium text-slate-300 mb-2 block">Room Theme Color</label>
          <div className="flex items-center gap-3">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Privacy Selector */}
        <div>
          <label className="text-xs font-medium text-slate-300 mb-2 block">Access & Privacy</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPrivacy('PRIVATE')}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                privacy === 'PRIVATE'
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-border bg-card/60 text-muted hover:border-slate-600'
              }`}
            >
              <Lock className="w-5 h-5 text-primary-light flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-text">Private (Default)</p>
                <p className="text-[11px] text-muted mt-0.5">Only members explicitly invited can access.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPrivacy('INVITE_ONLY')}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                privacy === 'INVITE_ONLY'
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-border bg-card/60 text-muted hover:border-slate-600'
              }`}
            >
              <Globe className="w-5 h-5 text-secondary-light flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-text">Invite Link</p>
                <p className="text-[11px] text-muted mt-0.5">Allows joining via secure shareable links.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!name.trim()}>
            Create Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
};
