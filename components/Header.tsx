'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarProject, UserMembership } from '@/lib/types';
import {
  Calendar,
  Flame,
  Plus,
  Share2,
  Layers,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';

interface HeaderProps {
  calendars: CalendarProject[];
  currentCalendar: CalendarProject | null;
  onSelectCalendar: (cal: CalendarProject) => void;
  onOpenNewCalendar: () => void;
  onOpenBranches: () => void;
  onOpenAddDeceased: () => void;
  onOpenSync: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  currentUser: { email: string; name: string; avatar?: string | null } | null;
  membership: UserMembership | null;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  calendars,
  currentCalendar,
  onSelectCalendar,
  onOpenNewCalendar,
  onOpenBranches,
  onOpenAddDeceased,
  onOpenSync,
  onOpenAuth,
  onSignOut,
  currentUser,
  membership,
  isAdmin,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
    : 'מש';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                    נר נשמה
                  </h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/70 font-serif">
                    ימי פטירה ויארצייט
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  לוח זיכרון משפחתי מסונכרן ליומן גוגל
                </p>
              </div>
            </div>

            {/* Mobile Auth Button */}
            <div className="md:hidden">
              {currentUser ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden"
                >
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  התחבר
                </button>
              )}
            </div>
          </div>

          {/* Navigation & Controls Bar */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Calendar Project Switcher */}
            <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200 shadow-inner">
              <Calendar className="w-4 h-4 text-slate-500 mr-2 ml-1 shrink-0" />
              <select
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1 pr-1 pl-2 max-w-[170px] truncate"
                value={currentCalendar?.id || ''}
                onChange={(e) => {
                  const selected = calendars.find((c) => c.id === e.target.value);
                  if (selected) onSelectCalendar(selected);
                }}
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onOpenNewCalendar}
                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition shadow-xs"
                title="צור פרויקט יומן משפחתי חדש"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Family Branches (Admin Only) */}
            {isAdmin && (
              <button
                onClick={onOpenBranches}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300/80 rounded-xl hover:bg-slate-50 transition shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>ענפי משפחה</span>
              </button>
            )}

            {/* Google Sync Button */}
            <button
              onClick={onOpenSync}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-200/80 rounded-xl hover:bg-blue-100 transition shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>סנכרון ליומן גוגל</span>
            </button>

            {/* Primary Action: Add Deceased */}
            <button
              onClick={onOpenAddDeceased}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm hover:shadow active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>הוסף נפטר</span>
            </button>

            {/* User Profile / Authentication Menu */}
            <div className="relative hidden md:block" ref={userMenuRef}>
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 pl-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="text-right leading-tight max-w-[120px] truncate">
                      <span className="block text-xs font-bold text-slate-800 truncate">
                        {currentUser.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        {isAdmin ? 'מנהל יומן' : 'חבר משפחה'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {isAdmin ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>הרשאת מנהל</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>חבר משפחה</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenNewCalendar();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
                        >
                          <Plus className="w-4 h-4 text-slate-400" />
                          <span>צור יומן משפחתי נוסף</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenSync();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
                        >
                          <Share2 className="w-4 h-4 text-slate-400" />
                          <span>הגדרות סנכרון אישי</span>
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>התנתק מהחשבון</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>התחברות / הרשמה</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
