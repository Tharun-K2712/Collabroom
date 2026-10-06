'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Sparkles, Lock, Mail, User, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { success, error } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password match status
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Password strength calculation
  const getStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await register({ fullName, email, password });
      success('Account created successfully!', 'Welcome to CollabRoom');
      router.push('/dashboard');
    } catch (err: any) {
      error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />

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
          <h2 className="text-xl font-bold text-white">Create your account</h2>
          <p className="text-xs text-muted">Join collaborative workspaces with fine-grained security</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Tharun Kumar"
            icon={<User className="w-4 h-4" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="tharun@collabroom.io"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <Input
              label="Password (min. 8 characters)"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password && (
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      strength >= level
                        ? strength <= 2
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Input
              label="Confirm Password"
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

          <Button type="submit" variant="primary" className="w-full mt-2" size="lg" isLoading={isLoading}>
            <span>Create Workspace Account</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>

        <div className="text-center text-xs text-muted pt-2 border-t border-border">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-light font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
