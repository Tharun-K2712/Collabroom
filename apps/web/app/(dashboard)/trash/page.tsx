'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { formatBytes, formatDate } from '@/lib/utils';
import { Trash2, RotateCcw, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TrashPage() {
  const { success, error } = useToast();
  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrash = async () => {
    setIsLoading(true);
    try {
      // Find all rooms, then aggregate trashed files
      const roomsRes = await api.get<any[]>('/rooms');
      if (roomsRes.success && roomsRes.data) {
        const filePromises = roomsRes.data.map((r) =>
          api.get<any>(`/rooms/${r.id}/files?isTrash=true`)
        );
        const results = await Promise.all(filePromises);
        const allTrash = results.flatMap((res) => (res.success && res.data ? res.data : []));
        setTrashFiles(allTrash);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestore = async (fileId: string, name: string) => {
    try {
      const res = await api.patch(`/files/${fileId}`, { isTrash: false });
      if (res.success) {
        success(`Restored "${name}"`, 'File Restored');
        setTrashFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (err: any) {
      error(err.message || 'Restore failed');
    }
  };

  const handlePermanentDelete = async (fileId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/files/${fileId}`);
      if (res.success) {
        success(`Permanently deleted "${name}"`);
        setTrashFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (err: any) {
      error(err.message || 'Permanent delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Trash Management</h1>
        <p className="text-xs text-muted mt-1">
          Review deleted documents. Restore them to active workspaces or delete permanently.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Scanning for deleted files...</p>
        </div>
      ) : trashFiles.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-2">
          <Trash2 className="w-10 h-10 text-muted mx-auto opacity-40" />
          <p className="font-semibold text-sm text-text">Trash is empty</p>
          <p className="text-xs text-muted">No documents are currently staged in trash.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Deleted Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {trashFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-card-hover/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span className="font-semibold text-text truncate max-w-sm">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted font-mono">{formatBytes(file.sizeBytes)}</td>
                    <td className="p-3.5 text-muted">{formatDate(file.updatedAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRestore(file.id, file.name)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handlePermanentDelete(file.id, file.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
