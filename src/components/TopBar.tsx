import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Command,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  User,
  LogOut,
  Key,
  ChevronDown
} from 'lucide-react';
import type { PageId, NotificationItem, UserProfile } from '../types';
import {
  fetchNotifications,
  markNotificationsReadApi
} from '../services/api';

interface TopBarProps {
  activePage?: PageId;
  currentUser?: UserProfile | null;
  onOpenCommandPalette: () => void;
  onSelectPage: (page: PageId) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onOpenCommandPalette,
  onSelectPage,
  onOpenAuthModal,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await markNotificationsReadApi();
      setNotifications(res.notifications || []);
      setUnreadCount(0);
    } catch {}
  };

  const user = currentUser;

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
        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              loadNotifications();
            }}
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
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 px-4 z-50 animate-in fade-in">
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
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#8762E0] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
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
                          {(!n.type || n.type === 'error') && <Info className="w-3 h-3 text-slate-400" />}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Menu */}
        <div className="relative">
          {user ? (
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-slate-100/70 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#9B7DE8] to-[#C4B5FD] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                {user.avatar_initials || 'AS'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{user.email}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="bayora-btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* User Profile Dropdown Menu */}
          {showUserMenu && user && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 px-2 z-50 animate-in fade-in">
              <div className="p-3 border-b border-slate-100 mb-1">
                <div className="font-bold text-xs text-slate-900">{user.name}</div>
                <div className="text-[11px] font-mono text-[#8762E0]">{user.email}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{user.role} · {user.organization}</div>
              </div>

              <div className="space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSelectPage('profile');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-purple-50 hover:text-[#8762E0] transition-colors flex items-center gap-2 cursor-pointer font-medium"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile & Workspace</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenAuthModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-purple-50 hover:text-[#8762E0] transition-colors flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Switch Account / Sign In</span>
                </button>

                <div className="border-t border-slate-100 my-1 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
