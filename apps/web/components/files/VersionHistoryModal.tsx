'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { History, Download, RotateCcw, UploadCloud, Check } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
  onVersionRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  file,
  onVersionRestored,
}) => {
  const { success, error } = useToast();
  const [isRestoring, setIsRestoring] = useState<number | null>(null);

  if (!file) return null;

  const handleDownloadVersion = async (versionNumber: number) => {
    try {
      const res = await api.get<any>(`/files/${file.id}/download-url?version=${versionNumber}`);
      if (res.success && res.data) {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      error(err.message || 'Download failed');
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    setIsRestoring(versionNumber);
    try {
      const res = await api.post(`/files/${file.id}/versions/${versionNumber}/restore`);
      if (res.success) {
        success(`Restored file to Version ${versionNumber}`, 'Version Restored');
        onVersionRestored();
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Failed to restore version');
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Version History: ${file.name}`}
      description="Inspect previous document iterations, download archives, or rollback to a previous version."
      maxWidth="lg"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {file.versions?.map((v: any) => {
          const isCurrent = v.versionNumber === file.currentVersion;
          return (
            <div
              key={v.id}
              className={`p-4 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-card/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text">Version {v.versionNumber}</span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Uploaded by <strong className="text-slate-300">{v.uploader?.fullName || 'Member'}</strong> • {formatDate(v.createdAt)}
                  </p>
                  {v.changeSummary && (
                    <p className="text-xs text-slate-300 mt-2 bg-input/80 px-2.5 py-1 rounded border border-border">
                      💬 {v.changeSummary}
                    </p>
                  )}
                </div>

                <span className="text-xs text-muted font-medium">{formatBytes(v.sizeBytes)}</span>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadVersion(v.versionNumber)}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>

                {!isCurrent && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isRestoring === v.versionNumber}
                    onClick={() => handleRestoreVersion(v.versionNumber)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Version</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};
