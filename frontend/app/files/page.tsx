'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatBytes, formatDate, getFileTypeInfo } from '@/lib/utils';
import { FileText, Download, Eye, Search, FolderKanban, Loader2, Laptop } from 'lucide-react';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { OpenWithModal } from '@/components/files/OpenWithModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedExt, setSelectedExt] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [openWithFile, setOpenWithFile] = useState<any | null>(null);
  const [openWithDownloadUrl, setOpenWithDownloadUrl] = useState<string | null>(null);

  const handleOpenWithApp = async (file: any) => {
    setOpenWithFile(file);
    try {
      const res = await api.get<any>(`/files/${file.id}/download-url`);
      if (res.success && res.data) {
        setOpenWithDownloadUrl(res.data.downloadUrl);
      }
    } catch {
      setOpenWithDownloadUrl(null);
    }
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<any>(`/search?q=${encodeURIComponent(search || ' ')}`);
      if (res.success && res.data?.files) {
        setFiles(res.data.files);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [search]);

  const extensions = ['ALL', 'pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'zip'];

  const filteredFiles = files.filter((f) => {
    if (selectedExt === 'ALL') return true;
    return f.extension?.toLowerCase() === selectedExt.toLowerCase();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Recent & Shared Documents</h1>
        <p className="text-xs text-muted mt-1">
          Explore and preview documents across all your authorized collaborative workspaces.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {extensions.map((ext) => (
            <button
              key={ext}
              onClick={() => setSelectedExt(ext)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                selectedExt === ext
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-input/60 text-muted hover:text-white'
              }`}
            >
              {ext}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted">Retrieving documents across workspaces...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border border-dashed text-center space-y-2">
          <FileText className="w-10 h-10 text-muted mx-auto opacity-40" />
          <p className="font-semibold text-sm text-text">No documents found</p>
          <p className="text-xs text-muted">Upload documents to your rooms to view them here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-input/60 border-b border-border text-muted uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">Workspace</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Uploaded By</th>
                  <th className="p-3.5">Modified</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredFiles.map((file) => {
                  const typeInfo = getFileTypeInfo(file.extension);
                  return (
                    <tr key={file.id} className="hover:bg-card-hover/60 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${typeInfo.bg} ${typeInfo.color}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-text truncate max-w-sm">{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Link
                          href={`/rooms/${file.roomId}`}
                          className="text-primary-light hover:underline font-medium"
                        >
                          {file.roomName}
                        </Link>
                      </td>
                      <td className="p-3.5 text-muted font-mono">{formatBytes(file.sizeBytes)}</td>
                      <td className="p-3.5 text-slate-300">{file.uploaderName || 'Member'}</td>
                      <td className="p-3.5 text-muted">{formatDate(file.updatedAt)}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenWithApp(file)}
                            title="Open Document With App (PowerPoint, Word, VS Code, Office 365, Google Docs)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/20 hover:bg-primary text-primary-light hover:text-white border border-primary/30 text-xs font-semibold transition-colors"
                          >
                            <Laptop className="w-3.5 h-3.5" />
                            <span>Open In...</span>
                          </button>
                          <button
                            onClick={() => setPreviewFileId(file.id)}
                            title="Quick Preview"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-input hover:bg-card border border-border text-xs text-slate-200 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={!!previewFileId}
        onClose={() => setPreviewFileId(null)}
        fileId={previewFileId}
        onOpenWith={(f, url) => {
          setOpenWithFile(f);
          setOpenWithDownloadUrl(url || null);
        }}
      />

      <OpenWithModal
        isOpen={!!openWithFile}
        onClose={() => {
          setOpenWithFile(null);
          setOpenWithDownloadUrl(null);
        }}
        file={openWithFile}
        downloadUrl={openWithDownloadUrl}
        onOpenInAppPreview={(fileId) => setPreviewFileId(fileId)}
      />
    </div>
    </DashboardLayout>
  );
}
