'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Sparkles,
  Shield,
  FolderKanban,
  Cloud,
  Users,
  Key,
  Clock,
  History,
  Activity,
  Bot,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: FolderKanban,
      title: 'Secure Rooms',
      desc: 'Independent workspaces for projects, teams, or departments with strict isolation.',
      color: 'text-indigo-400',
    },
    {
      icon: Cloud,
      title: 'Supabase File Storage',
      desc: 'High-speed cloud document storage with encrypted, short-lived signed URLs.',
      color: 'text-cyan-400',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      desc: 'Invite members via secure email tokens or shareable invite links with custom roles.',
      color: 'text-emerald-400',
    },
    {
      icon: Key,
      title: 'Granular 10-Point RBAC',
      desc: 'Owner, Manager, Editor, Viewer roles with independent download and deletion controls.',
      color: 'text-purple-400',
    },
    {
      icon: Activity,
      title: 'Real-Time Socket.IO',
      desc: 'Instant updates on uploads, member actions, permission adjustments, and alerts.',
      color: 'text-amber-400',
    },
    {
      icon: History,
      title: 'File Versioning & History',
      desc: 'Track document revisions, inspect changelogs, download archives, and rollback anytime.',
      color: 'text-rose-400',
    },
    {
      icon: Shield,
      title: 'Complete Audit Logging',
      desc: 'Immutable security tracking for user logins, file downloads, deletions, and role edits.',
      color: 'text-blue-400',
    },
    {
      icon: Bot,
      title: 'RoomAI Document Assistant',
      desc: 'Ask questions, summarize documents, and extract insights with strict authorization boundaries.',
      color: 'text-pink-400',
    },
  ];

  const steps = [
    { num: '01', title: 'Create a Room', desc: 'Set up an isolated workspace with custom colors, descriptions, and privacy tiers.' },
    { num: '02', title: 'Invite Your Team', desc: 'Send email invites or share links with predefined Owner, Manager, Editor, or Viewer roles.' },
    { num: '03', title: 'Upload & Organize', desc: 'Drag-and-drop documents, create nested folders, and preview PDFs and images inline.' },
    { num: '04', title: 'Set Fine Permissions', desc: 'Control exactly who can download, edit, rename, move, or delete critical documents.' },
    { num: '05', title: 'Collaborate Anywhere', desc: 'Access files remotely via temporary signed URLs with real-time sync and RoomAI.' },
  ];

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">
                Collab<span className="text-primary-light">Room</span>
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#security" className="hover:text-white transition-colors">Security & RBAC</a>
            <a href="#roomai" className="hover:text-white transition-colors">RoomAI</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="primary" size="md">
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Glow background accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[250px] bg-secondary/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary-light text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Cloud Workspace & Document Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            One Room. One Team. <br />
            <span className="bg-gradient-to-r from-primary-light via-purple-300 to-secondary-light bg-clip-text text-transparent">
              Everything Connected.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Securely collaborate, manage documents in Supabase Storage, enforce multi-tiered RBAC permissions, and work with your team from anywhere on earth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href={user ? '/dashboard' : '/register'}>
              <Button variant="primary" size="lg" className="w-full sm:w-auto text-sm px-8 py-3.5">
                <span>{user ? 'Open Your Dashboard' : 'Create Your First Room'}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-sm px-8 py-3.5">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Interactive Workspace Preview Mockup */}
          <div className="pt-14">
            <div className="relative mx-auto rounded-2xl border border-border bg-card/80 p-3 shadow-2xl shadow-primary/10 backdrop-blur-xl">
              <div className="rounded-xl border border-border/60 bg-[#0A1224] p-6 text-left space-y-6">
                {/* Header bar mock */}
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary-light font-bold text-xs">
                      AI
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-text">AI Research Team Workspace</h3>
                      <p className="text-xs text-muted">12 Members • 84 Documents • Supabase Encrypted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active Session
                    </span>
                  </div>
                </div>

                {/* KPI mini-cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-card border border-border/80 rounded-lg">
                    <p className="text-xs text-muted">Total Files</p>
                    <p className="text-lg font-bold text-white mt-0.5">84</p>
                  </div>
                  <div className="p-3 bg-card border border-border/80 rounded-lg">
                    <p className="text-xs text-muted">Team Members</p>
                    <p className="text-lg font-bold text-white mt-0.5">12</p>
                  </div>
                  <div className="p-3 bg-card border border-border/80 rounded-lg">
                    <p className="text-xs text-muted">Cloud Storage</p>
                    <p className="text-lg font-bold text-white mt-0.5">4.2 GB</p>
                  </div>
                  <div className="p-3 bg-card border border-border/80 rounded-lg">
                    <p className="text-xs text-muted">Security Audits</p>
                    <p className="text-lg font-bold text-white mt-0.5">156</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-border/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-primary-light uppercase tracking-widest">Enterprise Architecture</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Engineered for Absolute Security & Performance
            </p>
            <p className="text-sm text-muted">
              Every interaction is verified on the backend before data access is granted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-slate-600 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-input border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-base text-text mb-2">{f.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t border-border/60 bg-[#060D1A]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-primary-light uppercase tracking-widest">Simple & Powerful Workflow</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              How CollabRoom Works
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border relative">
                <span className="text-2xl font-black text-primary-light/40 mb-3 block">{s.num}</span>
                <h4 className="font-bold text-sm text-white mb-1.5">{s.title}</h4>
                <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Deep-Dive */}
      <section id="security" className="py-24 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Zero-Trust Permission Enforcement</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Never Trust Frontend UI. Backend Authorization on Every Request.
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Even if UI buttons are hidden, our Express backend independently checks room membership, active role permissions, and object-level rights before generating short-lived Supabase Storage signed URLs.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Temporary signed Supabase URLs prevent unauthorized file harvesting',
                  'Granular 10-point permission overrides per member',
                  'Immutable activity audit logging for compliance',
                  'JWT access token rotation with secure HTTP-only cookies',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="bg-input/60 rounded-xl p-5 border border-border space-y-4 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between pb-3 border-b border-border text-muted">
                  <span>RBAC Enforcement Verification Flow</span>
                  <Lock className="w-3.5 h-3.5 text-primary-light" />
                </div>
                <p className="text-slate-400">1. User sends request with JWT Bearer token</p>
                <p className="text-slate-400">2. Authenticate() validates token signature & status</p>
                <p className="text-indigo-300">3. RequireRoomMember() confirms room membership</p>
                <p className="text-indigo-300">4. RequirePermission('canDownload') evaluates role & matrix</p>
                <p className="text-emerald-400">5. Supabase Signed URL generated (Expires in 3600s) ➔ 200 OK</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 border-t border-border/60 bg-gradient-to-b from-background to-[#0B132B] text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to bring your team together?
          </h2>
          <p className="text-sm text-muted max-w-xl mx-auto">
            Experience complete security, cloud document workflows, and real-time collaboration with CollabRoom today.
          </p>
          <div className="pt-2">
            <Link href={user ? '/dashboard' : '/register'}>
              <Button variant="primary" size="lg" className="px-8 py-3.5 text-sm">
                <span>Create Your First Room</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Copyright Footer */}
      <footer className="border-t border-border/60 py-8 bg-[#07111F] text-center text-xs text-muted">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CollabRoom Platform. Production-grade Cloud Workspace & Document Architecture.</p>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
