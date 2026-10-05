'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/providers/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Sparkles, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post<any>('/auth/forgot-password', { email });
      if (res.success) {
        success('Password reset link has been generated.');
        if (res.data?.resetToken) {
          setResetToken(res.data.resetToken);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to request reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              Collab<span className="text-primary-light">Room</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white">Forgot your password?</h2>
          <p className="text-xs text-muted">Enter your email address and we will provide a reset link</p>
        </div>

        {resetToken ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset Token Generated</span>
            </div>
            <p className="text-xs text-slate-300">In this environment, you can directly continue with the link below:</p>
            <Link
              href={`/reset-password?token=${resetToken}`}
              className="block text-center py-2 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              Reset My Password Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              placeholder="tharun@collabroom.io"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
              Send Reset Instructions
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-muted pt-2 border-t border-border">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-primary-light hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
