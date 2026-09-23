'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { useAuth } from '../providers/AuthProvider';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { UploadCloud, File as FileIcon, Folder, CheckCircle2, X, FolderUp, Files } from 'lucide-react';

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  folderId?: string | null;
  onUploadSuccess: () => void;
}

interface UploadItem {
  file: File;
  relativePath: string;
  size: number;
}

export const FileUploaderModal: React.FC<FileUploaderModalProps> = ({
  isOpen,
  onClose,
  roomId,
  folderId,
  onUploadSuccess,
}) => {
  const { success, error } = useToast();
  const { refreshUser } = useAuth();
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  const [selectedItems, setSelectedItems] = useState<UploadItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const items: UploadItem[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      const relPath = (f as any).webkitRelativePath || f.name;
      items.push({
        file: f,
        relativePath: relPath,
        size: f.size,
      });
    }

    setSelectedItems(items);
    setUploadProgress(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const totalSize = selectedItems.reduce((acc, item) => acc + item.size, 0);

  // Fast upfront hierarchy resolution for all unique directories
  const resolveAllFolderHierarchies = async (items: UploadItem[], baseParentId: string | null = null): Promise<Record<string, string | null>> => {
    const folderCache: Record<string, string | null> = {};
    const uniquePaths = new Set<string>();

    for (const item of items) {
      const parts = item.relativePath.split(/[\\/]/);
      if (parts.length > 1) {
        const folderParts = parts.slice(0, -1);
        for (let i = 1; i <= folderParts.length; i++) {
          uniquePaths.add(folderParts.slice(0, i).join('/'));
        }
      }
    }

    // Sort by depth so parent directories are created before subdirectories
    const sortedPaths = Array.from(uniquePaths).sort((a, b) => a.split('/').length - b.split('/').length);

    for (const p of sortedPaths) {
      const parts = p.split('/');
      const dirName = parts[parts.length - 1];
      const parentKey = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
      const parentFolderId = parentKey ? folderCache[parentKey] ?? baseParentId : baseParentId;

      // Query existing folders at this level
      const query = parentFolderId ? `?parentId=${parentFolderId}` : '';
      const foldersRes = await api.get<any[]>(`/rooms/${roomId}/folders${query}`);
      const existing = foldersRes.data?.find((f: any) => f.name.toLowerCase() === dirName.toLowerCase());

      if (existing) {
        folderCache[p] = existing.id;
      } else {
        const createRes = await api.post<any>(`/rooms/${roomId}/folders`, {
          name: dirName,
          parentId: parentFolderId,
        });
        if (createRes.success && createRes.data) {
          folderCache[p] = createRes.data.id;
        }
      }
    }

    return folderCache;
  };

  const handleUpload = async () => {
    if (selectedItems.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setCurrentUploadingFile('Preparing folder structure...');
      const folderCache = await resolveAllFolderHierarchies(selectedItems, folderId || null);

      let completedCount = 0;
      let queueIndex = 0;
      const PARALLEL_CONCURRENCY = 4;

      const uploadWorker = async () => {
        while (queueIndex < selectedItems.length) {
          const currentIndex = queueIndex++;
          const item = selectedItems[currentIndex];

          // Resolve target folder ID from cache
          let targetFolderId = folderId || null;
          const parts = item.relativePath.split(/[\\/]/);
          if (parts.length > 1) {
            const folderKey = parts.slice(0, -1).join('/');
            targetFolderId = folderCache[folderKey] || null;
          }

          setCurrentUploadingFile(`(${completedCount + 1}/${selectedItems.length}) ${item.file.name}`);

          // 1. Request presigned upload URL
          const urlRes = await api.post<any>(`/rooms/${roomId}/files/upload-url`, {
            name: item.file.name,
            originalName: item.file.name,
            mimeType: item.file.type || 'application/octet-stream',
            sizeBytes: item.file.size,
            folderId: targetFolderId,
          });

          if (!urlRes.success || !urlRes.data) {
            throw new Error(urlRes.message || `Could not obtain upload URL for ${item.file.name}`);
          }

          const { uploadUrl, storageKey } = urlRes.data;

          // 2. Upload binary
          await api.uploadToSignedUrl(uploadUrl, item.file);

          // 3. Finalize metadata
          await api.post(`/rooms/${roomId}/files`, {
            name: item.file.name,
            originalName: item.file.name,
            mimeType: item.file.type || 'application/octet-stream',
            sizeBytes: item.file.size,
            storageKey,
            folderId: targetFolderId,
          });

          completedCount++;
          const percent = Math.round((completedCount / selectedItems.length) * 100);
          setUploadProgress(percent);
          setCurrentUploadingFile(`Uploaded ${completedCount}/${selectedItems.length} files (${percent}%)`);
        }
      };

      const workerCount = Math.min(PARALLEL_CONCURRENCY, selectedItems.length);
      await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));

      // Update user storage quota immediately in context/top navbar
      try {
        await refreshUser();
      } catch (e) {
        console.error('Failed to refresh user quota', e);
      }

      success(
        `Uploaded ${completedCount} document${completedCount > 1 ? 's' : ''} successfully!`,
        'Upload Complete'
      );

      setTimeout(() => {
        setSelectedItems([]);
        setUploadProgress(0);
        setCurrentUploadingFile('');
        onUploadSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={uploadMode === 'folder' ? 'Upload Entire Folder' : 'Upload Files to Room'}
      description="Files and folder structures are preserved and stored securely with fine-grained RBAC."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Mode Switcher */}
        {!isUploading && selectedItems.length === 0 && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-input/80 rounded-xl border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUploadMode('files')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                uploadMode === 'files' ? 'bg-primary text-white shadow' : 'text-muted hover:text-white'
              }`}
            >
              <Files className="w-4 h-4" />
              <span>Upload Individual Files</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('folder')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                uploadMode === 'folder' ? 'bg-primary text-white shadow' : 'text-muted hover:text-white'
              }`}
            >
              <FolderUp className="w-4 h-4" />
              <span>Upload Entire Folder</span>
            </button>
          </div>
        )}

        {/* Dropzone */}
        {selectedItems.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (uploadMode === 'folder') {
                folderInputRef.current?.click();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 bg-input/40'
            }`}
          >
            {/* Hidden Input for multiple files */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            {/* Hidden Input for folder upload */}
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-3">
              {uploadMode === 'folder' ? (
                <FolderUp className="w-7 h-7 text-primary-light" />
              ) : (
                <UploadCloud className="w-7 h-7 text-primary-light" />
              )}
            </div>

            <p className="text-sm font-semibold text-text">
              {uploadMode === 'folder'
                ? 'Click to select a Folder from your computer'
                : 'Drop your files here, or '}
              {uploadMode === 'files' && <span className="text-primary-light underline">Browse</span>}
            </p>
            <p className="text-xs text-muted mt-1">
              {uploadMode === 'folder'
                ? 'All files and nested subdirectories will be automatically uploaded into this workspace'
                : 'Supports multi-file selection: PDF, DOCX, XLSX, Code, Images, ZIP, and Media'}
            </p>
          </div>
        ) : (
          <div className="bg-input/60 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  {uploadMode === 'folder' ? <Folder className="w-4 h-4 text-secondary-light" /> : <Files className="w-4 h-4 text-primary-light" />}
                  <span>{selectedItems.length} Document{selectedItems.length > 1 ? 's' : ''} Selected</span>
                </p>
                <p className="text-xs text-muted">Total Size: {formatBytes(totalSize)}</p>
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                  className="text-xs text-muted hover:text-white"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* List of files */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileIcon className="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
                    <span className="truncate text-text font-medium" title={item.relativePath}>
                      {item.relativePath}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted text-[11px]">{formatBytes(item.size)}</span>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-muted hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-1.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="truncate font-medium text-slate-300">{currentUploadingFile}</span>
                  <span className="font-semibold text-primary-light">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleUpload}
            isLoading={isUploading}
            disabled={selectedItems.length === 0}
          >
            {uploadMode === 'folder' ? 'Upload Folder' : `Upload ${selectedItems.length > 0 ? `${selectedItems.length} Files` : 'Files'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
