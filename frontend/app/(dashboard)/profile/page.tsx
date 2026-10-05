'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { User, Mail, Phone, Lock, Shield, Check } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await api.patch('/users/profile', {
        fullName,
        bio: bio || null,
        phone: phone || null,
      });

      if (res.success) {
        success('Profile updated successfully');
        refreshUser();
      }
    } catch (err: any) {
      error(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.post('/users/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      error(err.message || 'Failed to change password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Account & Security</h1>
        <p className="text-xs text-muted mt-1">Manage your identity credentials and workspace security profile.</p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <User className="w-5 h-5 text-primary-light" />
          <h2 className="font-bold text-sm text-white">Personal Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            helperText="Contact system admin to modify email"
          />

          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 019-2834"
          />

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">System Role</label>
            <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-input border border-border text-primary-light">
              {user?.systemRole || 'USER'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Bio / Role Description</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell your team a little about your role and expertise..."
            className="w-full bg-input border border-border rounded-lg p-3 text-xs text-text focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" isLoading={isUpdatingProfile}>
            Save Profile Details
          </Button>
        </div>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Lock className="w-5 h-5 text-primary-light" />
          <h2 className="font-bold text-sm text-white">Change Password</h2>
        </div>

        <div className="space-y-3 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Password (min. 8 chars)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" isLoading={isUpdatingPassword}>
              Update Password
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
