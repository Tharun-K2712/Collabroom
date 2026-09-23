'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';
import { useAuth } from '../providers/AuthProvider';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({ isOpen, onClose, file }) => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const res = await api.get<any[]>(`/files/${file.id}/comments`);
      if (res.success && res.data) {
        setComments(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && file) {
      loadComments();
    }
  }, [isOpen, file]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !file) return;

    setIsSubmitting(true);
    try {
      const res = await api.post(`/files/${file.id}/comments`, {
        content: content.trim(),
      });

      if (res.success) {
        setContent('');
        loadComments();
        success('Comment posted');
      }
    } catch (err: any) {
      error(err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        success('Comment deleted');
      }
    } catch (err: any) {
      error(err.message || 'Failed to delete comment');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Right Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-primary-light" />
                <div>
                  <h3 className="font-semibold text-text text-sm truncate max-w-[260px]">
                    {file?.name}
                  </h3>
                  <p className="text-[11px] text-muted">Document Collaboration & Feedback</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-card-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comment Stream */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center text-muted">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs mt-1">Start the conversation with your team!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-input/40 border border-border space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.user.fullName} src={c.user.avatarUrl} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-text">{c.user.fullName}</p>
                          <p className="text-[10px] text-muted">{formatDate(c.createdAt)}</p>
                        </div>
                      </div>

                      {c.userId === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed pl-8">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Input */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-border bg-card/60">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add a comment or tag team members..."
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!content.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
