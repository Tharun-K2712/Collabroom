'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Sparkles, Lock, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { success, error } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      if (res.success) {
        success('Password has been successfully updated.', 'Password Reset');
        router.push('/login');
      }
    } catch (err: any) {
      error(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        icon={<Lock className="w-4 h-4" />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted hover:text-slate-200 transition-colors p-1 rounded focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoFocus
      />

      <div className="space-y-1">
        <Input
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
          rightElement={
            <div className="flex items-center gap-1.5">
              {passwordsMatch && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 animate-in fade-in zoom-in-75 duration-200" title="Passwords match">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              )}
              {passwordsMismatch && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 animate-in fade-in zoom-in-75 duration-200" title="Passwords do not match">
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted hover:text-slate-200 transition-colors p-1 rounded focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          }
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {passwordsMatch && (
          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Passwords match
          </p>
        )}
        {passwordsMismatch && (
          <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 pt-0.5">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            Passwords do not match
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
        <span>Save New Password</span>
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <h2 className="text-xl font-bold text-white">Reset your password</h2>
          <p className="text-xs text-muted">Create a secure new password for your account</p>
        </div>

        <Suspense fallback={<div className="text-center text-xs text-muted">Loading reset parameters...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center text-xs text-muted pt-2 border-t border-border">
          <Link href="/login" className="text-primary-light hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
