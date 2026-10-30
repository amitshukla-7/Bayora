import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, User, Building, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { loginApi, registerApi } from '../services/api';
import type { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleQuickFillPrimary = () => {
    setEmail('amitshukla@1234');
    setPassword('amitshukla7');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginApi(email.trim(), password);
        setSuccessMessage(`Welcome back, ${res.user.name}!`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 400);
      } else {
        const res = await registerApi({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          organization: organization.trim() || undefined
        });
        setSuccessMessage(`Workspace created for ${res.user.name}!`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#8762E0] via-[#9B7DE8] to-[#B09BF0] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Bayora Security Identity</h2>
          <p className="text-xs text-white/80 mt-1">
            {mode === 'login'
              ? 'Sign in to access your designated workspace & model evaluations.'
              : 'Create an isolated workspace with private model data & metrics.'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors cursor-pointer ${
              mode === 'login'
                ? 'text-[#8762E0] border-b-2 border-[#8762E0] bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors cursor-pointer ${
              mode === 'register'
                ? 'text-[#8762E0] border-b-2 border-[#8762E0] bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / Team (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Red Team Ops"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Email / Username
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleQuickFillPrimary}
                  className="text-[11px] font-semibold text-[#8762E0] hover:underline cursor-pointer"
                >
                  Fill Demo: amitshukla@1234
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. amitshukla@1234 or name@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B7DE8]/30 focus:border-[#8762E0]"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Minimum 6 characters. Memory-hard scrypt encryption with unique random salt.
              </p>
            )}
          </div>

          {mode === 'login' && (
            <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 flex items-center justify-between">
              <span>Primary Profile Account:</span>
              <span className="font-mono font-bold">amitshukla@1234</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8762E0] to-[#9B7DE8] hover:from-[#7952D8] hover:to-[#8762E0] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                'Sign In to Workspace'
              ) : (
                'Create Workspace Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

