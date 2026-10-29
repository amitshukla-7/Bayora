import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  ShieldCheck,
  Flame,
  User,
  Database,
  Sparkles,
  RotateCcw,
  HardDrive,
  ShieldAlert
} from 'lucide-react';
import type { PageId } from '../types';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  onResetDemo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  onResetDemo,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'redteam', label: 'Red Team', icon: Flame, badge: 'Core' },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'datasets', label: 'Datasets', icon: Database },
    { id: 'pricing', label: 'Pricing', icon: Sparkles, badge: 'Coming Soon' },
  ];

  return (
    <aside className="w-[280px] h-screen flex flex-col bg-white/75 backdrop-blur-xl border-r border-slate-200/80 select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-6 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8762E0] to-[#B39BF5] flex items-center justify-center shadow-[0_4px_16px_rgba(155,125,232,0.35)] text-white">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-slate-900 tracking-tight">Bayora</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-[#f4efff] text-[#8762E0] border border-[#e5d9fd]">
              Center
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium tracking-tight">
            AI Security & Governance
          </span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#f4efff] text-[#7952D8] font-semibold shadow-xs border border-[#e8dcfc]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#8762E0]' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    item.badge === 'Coming Soon'
                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                      : 'bg-[#9B7DE8]/15 text-[#7952D8]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Panel & Storage Meter */}
      <div className="p-4 border-t border-slate-200/70 bg-slate-50/50">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Bayora Platform</div>
              <div className="text-[11px] text-slate-500 font-normal">Enterprise · AI Security</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Storage Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-400" /> Storage
              </span>
              <span className="font-mono font-medium text-slate-700">1.2 GB / 5.0 GB</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#9B7DE8] h-full rounded-full transition-all duration-300" style={{ width: '24%' }} />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>24% Allocated</span>
              <span className="italic">Demo Storage</span>
            </div>
          </div>

          {/* Reset Demo Data Action */}
          <button
            onClick={onResetDemo}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
            title="Reset database to initial seed state"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Demo Workspace</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
