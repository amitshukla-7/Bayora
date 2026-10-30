import React, { useState } from 'react';
import { ShieldCheck, Server, User, Key, LogOut, Save, CheckCircle2 } from 'lucide-react';
import type { PageId, UserProfile } from '../types';
import { updateUserProfileApi, getAuthToken } from '../services/api';

interface ProfilePageProps {
  currentUser?: UserProfile | null;
  onNavigate?: (page: PageId) => void;
  onResetDemo: () => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onResetDemo,
  onOpenAuthModal,
  onLogout,
  onProfileUpdate
}) => {
  const profile = currentUser || {
    id: '',
    name: 'Operator',
    role: 'Security Engineer',
    email: '',
    avatar_initials: 'OP',
    organization: 'Enterprise Workspace'
  };

  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [organization, setOrganization] = useState(profile.organization);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeToken = getAuthToken() || 'byra_sess_default_primary_active';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updated = await updateUserProfileApi({
        name,
        role,
        organization
      });
      if (onProfileUpdate) {
        onProfileUpdate(updated);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Profile & Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your authenticated operator profile, credentials, and data isolation boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8762E0] font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-purple-200"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* User Card */}
      <div className="bayora-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#9B7DE8] to-[#C4B5FD] flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {profile.avatar_initials || 'AS'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-center sm:self-auto">
              {profile.role}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center justify-center sm:justify-start gap-1.5">
            <span>Identifier:</span>
            <span className="font-bold text-slate-800">{profile.email}</span>
          </div>
          <div className="text-xs text-slate-400">
            Organization: <span className="text-slate-600 font-medium">{profile.organization}</span> · 
            Workspace ID: <span className="font-mono text-[11px] text-purple-700">{profile.id}</span>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Form */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#8762E0] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operator Details</h3>
              <p className="text-xs text-slate-500">Update display name, title, and organization.</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved successfully</span>
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#8762E0] hover:bg-[#7952D8] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Update Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Workspace Cluster Card */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#8762E0] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tenant Data Isolation</h3>
              <p className="text-xs text-slate-500">
                Multi-tenant SQLite database architecture with per-user data scoping.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-purple-50 text-[#8762E0] border border-purple-200">
            Isolated Workspace
          </span>
        </div>
      </div>

      {/* Security Credentials & Session Controls */}
      <div className="bayora-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#8762E0]" />
          <span>Security & Session Identity</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">Operator Session Token</div>
              <div className="font-mono text-[11px] text-slate-400">
                {activeToken.slice(0, 24)}...
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active Session
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">Password Encryption Standard</div>
              <div className="text-[11px] text-slate-400">
                Native scrypt memory-hard key derivation + timing-safe equality
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              scrypt (NIST / OWASP)
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onResetDemo}
            className="bayora-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Reset Workspace Fixtures
          </button>
        </div>
      </div>
    </div>
  );
};
