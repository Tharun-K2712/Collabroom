'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { api } from '@/lib/api';
import { Sparkles, Users, ArrowRight, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async () => {
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setIsJoining(true);
    try {
      const res = await api.post<any>(`/rooms/accept/${token}`);
      if (res.success && res.data?.roomId) {
        success('Joined workspace successfully!', 'Welcome to the Room');
        router.push(`/rooms/${res.data.roomId}`);
      }
    } catch (err: any) {
      error(err.message || 'Failed to join workspace');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mx-auto shadow-xl">
          <Users className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Workspace Invitation</h2>
          <p className="text-xs text-muted leading-relaxed">
            You have received an invitation to collaborate on documents and projects inside CollabRoom.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-input/60 border border-border text-left space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Role-Based Workspace Access</span>
          </div>
          <p className="text-[11px] text-muted">
            Upon accepting, you will gain access according to the role permissions assigned by the room host.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isJoining}
            onClick={handleJoinRoom}
          >
            <span>{user ? 'Accept Invitation & Enter Room' : 'Sign in to Accept'}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>

          <Link href="/" className="inline-block text-xs text-muted hover:text-white">
            Decline & Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
