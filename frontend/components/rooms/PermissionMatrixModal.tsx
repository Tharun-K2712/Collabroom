'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api } from '@/lib/api';
import { RoomMemberPermissions } from '@/types/shared';
import { ShieldCheck, Lock, Check } from 'lucide-react';

interface PermissionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  member: any;
  onUpdated: () => void;
}

export const PermissionMatrixModal: React.FC<PermissionMatrixModalProps> = ({
  isOpen,
  onClose,
  roomId,
  member,
  onUpdated,
}) => {
  const { success, error } = useToast();
  const [permissions, setPermissions] = useState<RoomMemberPermissions>(
    member?.permission || {
      canView: true,
      canUpload: false,
      canDownload: true,
      canEdit: false,
      canDelete: false,
      canRename: false,
      canMove: false,
      canShare: false,
      canManageMembers: false,
      canManagePermissions: false,
    }
  );
  const [isLoading, setIsLoading] = useState(false);

  const permissionItems: { key: keyof RoomMemberPermissions; label: string; desc: string }[] = [
    { key: 'canView', label: 'View Documents', desc: 'Browse room, files, and folders.' },
    { key: 'canUpload', label: 'Upload Files & Folders', desc: 'Upload new documents and create folders.' },
    { key: 'canDownload', label: 'Download Files', desc: 'Download documents to local machine.' },
    { key: 'canEdit', label: 'Edit & New Versions', desc: 'Upload replacement versions and edit file metadata.' },
    { key: 'canDelete', label: 'Delete Files to Trash', desc: 'Move files to trash or permanent deletion.' },
    { key: 'canRename', label: 'Rename Files & Folders', desc: 'Modify document and folder names.' },
    { key: 'canMove', label: 'Move & Organize', desc: 'Move files between folders.' },
    { key: 'canShare', label: 'Share Documents', desc: 'Generate external file share tokens.' },
    { key: 'canManageMembers', label: 'Manage Members', desc: 'Invite or remove members in room.' },
    { key: 'canManagePermissions', label: 'Manage Permissions', desc: 'Modify RBAC and custom permission matrix.' },
  ];

  const handleToggle = (key: keyof RoomMemberPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await api.patch(`/rooms/${roomId}/members/${member.userId}/permissions`, permissions);
      if (res.success) {
        success('Custom permissions updated successfully', 'Permissions Saved');
        onUpdated();
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Granular Permissions: ${member?.user?.fullName || 'Member'}`}
      description={`Role: ${member?.role}. Customize precise permissions for this member below.`}
      maxWidth="lg"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {permissionItems.map((item) => {
          const isGranted = permissions[item.key];
          return (
            <div
              key={item.key}
              onClick={() => handleToggle(item.key)}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                isGranted
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-card/60 hover:border-slate-600'
              }`}
            >
              <div className="flex-1 pr-4">
                <p className="text-xs font-semibold text-text">{item.label}</p>
                <p className="text-[11px] text-muted mt-0.5">{item.desc}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isGranted
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'border-border bg-input text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-border mt-5">
        <span className="text-xs text-muted">Owner always possesses full permissions.</span>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={isLoading}>
            Save Permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
};
