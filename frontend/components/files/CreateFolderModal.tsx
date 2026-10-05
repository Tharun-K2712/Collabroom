'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api } from '@/lib/api';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  parentId?: string | null;
  onFolderCreated: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  roomId,
  parentId,
  onFolderCreated,
}) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [isLoading, setIsLoading] = useState(false);

  const colors = ['#6366F1', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post(`/rooms/${roomId}/folders`, {
        name: name.trim(),
        parentId,
        color,
      });

      if (res.success) {
        success(`Folder "${name}" created!`, 'Folder Created');
        setName('');
        onFolderCreated();
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Folder"
      description="Organize your room files into hierarchical categories."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Folder Name"
          placeholder="e.g. Research Papers, Client Documents, Assets"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div>
          <label className="text-xs font-medium text-slate-300 mb-2 block">Folder Accent Color</label>
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

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!name.trim()}>
            Create Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
};
