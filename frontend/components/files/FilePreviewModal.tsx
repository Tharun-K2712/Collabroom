'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../providers/ToastProvider';
import { api, getFullFileUrl, downloadFileFromUrl } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  Download,
  FileText,
  Loader2,
  ExternalLink,
  Edit3,
  Eye,
  CheckCircle2,
  Save,
  Sparkles,
  Laptop,
} from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
  onOpenWith?: (file: any, downloadUrl?: string | null) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileId,
  onOpenWith,
}) => {
  const { success, error } = useToast();
  const [file, setFile] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadDirect = async () => {
    if (!downloadUrl || !file) return;
    try {
      success(`Downloading "${file.name}"...`);
      await downloadFileFromUrl(downloadUrl, file.originalName || file.name);
    } catch (err: any) {
      error(err.message || 'Download failed');
    }
  };

  // Editor states
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isEditable, setIsEditable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch file & content
  useEffect(() => {
    if (!isOpen || !fileId) {
      setFile(null);
      setDownloadUrl(null);
      setContent('');
      setOriginalContent('');
      setSaveStatus('idle');
      setActiveTab('preview');
      return;
    }

    const loadFileData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch file details
        const detailsRes = await api.get<any>(`/files/${fileId}`);
        if (detailsRes.success && detailsRes.data) {
          setFile(detailsRes.data);
        }

        // 2. Fetch download URL
        const urlRes = await api.get<any>(`/files/${fileId}/download-url`);
        if (urlRes.success && urlRes.data) {
          setDownloadUrl(getFullFileUrl(urlRes.data.downloadUrl));
        }

        // 3. Fetch editable raw content
        try {
          const contentRes = await api.get<any>(`/files/${fileId}/content`);
          if (contentRes.success && contentRes.data) {
            setContent(contentRes.data.content || '');
            setOriginalContent(contentRes.data.content || '');
            setIsEditable(contentRes.data.isEditable || false);
            // Default to edit view for text documents
            if (contentRes.data.isEditable && (contentRes.data.content || '').length > 0) {
              setActiveTab('edit');
            }
          }
        } catch {
          setIsEditable(false);
        }
      } catch (err: any) {
        error(err.message || 'Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileData();
  }, [isOpen, fileId]);

  // Autosave action
  const performSave = useCallback(
    async (textToSave: string) => {
      if (!fileId) return;
      setIsSaving(true);
      setSaveStatus('saving');
      try {
        const res = await api.put<any>(`/files/${fileId}/content`, {
          content: textToSave,
        });

        if (res.success) {
          setOriginalContent(textToSave);
          setSaveStatus('saved');
          setTimeout(() => {
            setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
          }, 2500);
        }
      } catch (err: any) {
        setSaveStatus('unsaved');
        error(err.message || 'Autosave failed');
      } finally {
        setIsSaving(false);
      }
    },
    [fileId, error]
  );

  // Handle content change with 1.2s debounced autosave
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performSave(newText);
    }, 1200);
  };

  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    performSave(content);
  };

  const ext = file?.extension?.toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext || '');
  const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext || '');
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext || '');
  const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(ext || '');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file?.name || 'Document'}
      description={
        file
          ? `${formatBytes(file.sizeBytes)} • Version ${file.currentVersion} • Modified ${formatDate(file.updatedAt)}`
          : undefined
      }
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Top Action / Tab Bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'preview'
                  ? 'bg-primary/20 text-primary-light border border-primary/30'
                  : 'text-muted hover:text-white hover:bg-card'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-primary/20 text-primary-light border border-primary/30'
                    : 'text-muted hover:text-white hover:bg-card'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit with Autosave</span>
              </button>
            )}

            {onOpenWith && file && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWith(file, downloadUrl);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                title="Choose external desktop or cloud application (PowerPoint, Word, VS Code, Google Docs, Office Online)"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Open in App...</span>
              </button>
            )}
          </div>

          {/* Autosave Status Indicator */}
          {activeTab === 'edit' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Autosaving changes...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All changes autosaved</span>
                  </span>
                )}
                {saveStatus === 'unsaved' && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Unsaved edits</span>
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-primary-light" />
                    <span>Autosave active</span>
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleManualSave}
                isLoading={isSaving}
                className="text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>Save Now</span>
              </Button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted">Retrieving document...</p>
          </div>
        ) : activeTab === 'edit' && isEditable ? (
          /* Live Document Editor */
          <div className="space-y-2">
            <div className="relative rounded-xl border border-border bg-slate-950/90 overflow-hidden">
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start typing your document content here..."
                rows={18}
                className="w-full bg-transparent p-4 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted px-1">
              <span>
                {wordCount} words • {charCount} characters
              </span>
              <span>Edits are automatically saved to your cloud workspace</span>
            </div>
          </div>
        ) : (
          /* Preview View */
          <div className="min-h-[420px] max-h-[70vh] bg-slate-950/80 rounded-xl border border-border overflow-hidden flex items-center justify-center">
            {isPdf && downloadUrl && (
              <div className="w-full h-[65vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-border/60">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-border/80 text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5 truncate max-w-md">
                    <FileText className="w-4 h-4 text-primary-light flex-shrink-0" />
                    <span className="truncate">{file?.name || 'PDF Document'}</span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => window.open(downloadUrl, '_blank')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-input hover:bg-card border border-border text-xs text-slate-200 hover:text-white transition-colors"
                      title="Open PDF in a full browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Full Tab</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDirect}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors"
                      title="Download PDF document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
                <div className="relative flex-1 w-full h-full min-h-[400px]">
                  <object
                    data={`${downloadUrl}#toolbar=1`}
                    type="application/pdf"
                    className="w-full h-full border-0"
                  >
                    <iframe
                      src={`${downloadUrl}#toolbar=1`}
                      className="w-full h-full border-0"
                      title={file?.name}
                    >
                      <div className="p-8 text-center space-y-3">
                        <p className="text-xs text-muted">Your browser does not support inline PDF preview.</p>
                        <Button onClick={() => window.open(downloadUrl, '_blank')} size="sm">
                          Open PDF in New Window
                        </Button>
                      </div>
                    </iframe>
                  </object>
                </div>
              </div>
            )}

            {isImage && downloadUrl && (
              <div className="p-4 flex items-center justify-center h-full w-full">
                <img
                  src={downloadUrl}
                  alt={file?.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            {isVideo && downloadUrl && (
              <video controls className="w-full max-h-[60vh] rounded-lg">
                <source src={downloadUrl} type={file?.mimeType} />
                Your browser does not support HTML5 video.
              </video>
            )}

            {isAudio && downloadUrl && (
              <div className="p-12 text-center">
                <audio controls className="w-96 max-w-full">
                  <source src={downloadUrl} type={file?.mimeType} />
                </audio>
              </div>
            )}

            {/* Render formatted text preview if editable text file */}
            {isEditable && content && (
              <div className="w-full h-[60vh] overflow-y-auto p-6 text-left">
                <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {content}
                </pre>
              </div>
            )}

            {/* Office document fallback */}
            {isOfficeDoc && (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-primary-light">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">{file?.name}</h3>
                  <p className="text-xs text-muted mt-1 max-w-md">
                    {['ppt', 'pptx'].includes(ext || '')
                      ? 'Microsoft PowerPoint Presentation'
                      : ['doc', 'docx'].includes(ext || '')
                      ? 'Microsoft Word Document'
                      : ['xls', 'xlsx'].includes(ext || '')
                      ? 'Microsoft Excel Spreadsheet'
                      : 'Office Document'}{' '}
                    ({file?.extension?.toUpperCase()}). Open directly in PowerPoint, Word, Excel, Office Online, or Google Slides.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {onOpenWith && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenWith(file, downloadUrl);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-md cursor-pointer"
                    >
                      <Laptop className="w-4 h-4" />
                      <span>
                        Choose App (
                        {['ppt', 'pptx'].includes(ext || '')
                          ? 'PowerPoint / Slides'
                          : ['doc', 'docx'].includes(ext || '')
                          ? 'Word / Docs'
                          : 'Excel / Sheets'}
                        )
                      </span>
                    </button>
                  )}
                  {downloadUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadDirect}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card hover:bg-card-hover border border-border text-slate-200 text-xs font-semibold transition-colors shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {!isPdf && !isImage && !isVideo && !isAudio && !isEditable && !isOfficeDoc && (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-primary-light">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">{file?.name}</h3>
                  <p className="text-xs text-muted mt-1 max-w-md">
                    Direct in-browser preview is not available for this file type ({file?.extension ? `.${file.extension.toUpperCase()}` : 'document'}).
                    You can download and open it using your local computer applications.
                  </p>
                </div>
                {downloadUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadDirect}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold mt-3 transition-colors shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {file?.originalName || 'Document'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info & controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted">
            Uploaded by: <strong className="text-text">{file?.uploader?.fullName || 'User'}</strong>
          </span>
          <div className="flex items-center gap-3">
            {downloadUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadDirect}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(downloadUrl, '_blank')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-card text-xs text-muted hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>
              </>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
