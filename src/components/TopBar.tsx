import React, { useState } from 'react';
import {
  Search,
  Bot,
  Bell,
  Command,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { PageId, NotificationItem } from '../types';

interface TopBarProps {
  activePage?: PageId;
  onOpenCommandPalette: () => void;
  onOpenAssistant: () => void;
  onSelectPage: (page: PageId) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandPalette,
  onOpenAssistant,
  onSelectPage,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Q3 Evaluation Suite Completed',
      message: 'Comprehensive Red Team run finished with 19 passed and 2 critical findings.',
      type: 'warning',
      timestamp: '10m ago',
      read: false
    },
    {
      id: 'notif_2',
      title: 'Policy POL-001 Enforced',
      message: 'Synthetic secret disclosure blocked on DistilGPT2 evaluation.',
      type: 'info',
      timestamp: '25m ago',
      read: false
    },
    {
      id: 'notif_3',
      title: 'Audit Ledger Verified',
      message: 'SHA-256 evidence chain integrity cryptographically validated.',
      type: 'success',
      timestamp: '1h ago',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 px-6 bg-white/70 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between shrink-0 z-10">
      {/* Search Input Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer w-72 md:w-88 justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search models, tests, findings, datasets...</span>
          </div>
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white rounded-md border border-slate-200 shadow-2xs">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Button */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#f4efff] hover:bg-[#ede5fd] border border-[#e5d9fd] text-[#7952D8] text-xs font-medium transition-all shadow-2xs cursor-pointer group"
        >
          <Bot className="w-4 h-4 text-[#8762E0] group-hover:scale-110 transition-transform" />
          <span>AI Assistant</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#8762E0] animate-ping" />
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ef4444] text-[10px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 px-4 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-[#7952D8] font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-[#8762E0] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 transition-colors ${
                      n.read ? 'bg-slate-50/70 text-slate-600' : 'bg-purple-50/50 text-slate-800 border border-purple-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1.5">
                        {n.type === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        {n.type === 'info' && <ShieldCheck className="w-3 h-3 text-[#8762E0]" />}
                        {n.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <button
          onClick={() => onSelectPage('profile')}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-slate-100/70 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#9B7DE8] to-[#C4B5FD] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
            AS
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800">Amit Shukla</span>
            <span className="text-[10px] text-slate-400">Principal Architect</span>
          </div>
        </button>
      </div>
    </header>
  );
};
