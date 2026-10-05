'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarProject, UserMembership } from '@/lib/types';
import { formatCalendarDisplayName } from '@/lib/hebrew-calendar';
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
  LayoutGrid,
  Trash2,
  Sparkles,
  GitCommit,
} from 'lucide-react';

interface HeaderProps {
  calendars: CalendarProject[];
  currentCalendar: CalendarProject | null;
  onSelectCalendar: (cal: CalendarProject) => void;
  onBackToHub?: () => void;
  onOpenNewCalendar: () => void;
  onOpenBranches: () => void;
  onOpenAddDeceased: () => void;
  onOpenGemImport?: () => void;
  onOpenSync: () => void;
  onOpenShare?: () => void;
  onDeleteCurrentCalendar?: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  currentUser: { email: string; name: string; avatar?: string | null } | null;
  membership: UserMembership | null;
  isAdmin: boolean;
  canEdit?: boolean;
  userGeneration?: number;
  onUpdateUserGeneration?: (gen: number) => void;
  todayHebrewDate?: string;
  todayGregorianDate?: string;
}

export const Header: React.FC<HeaderProps> = ({
  calendars,
  currentCalendar,
  onSelectCalendar,
  onBackToHub,
  onOpenNewCalendar,
  onOpenBranches,
  onOpenAddDeceased,
  onOpenGemImport,
  onOpenSync,
  onOpenShare,
  onDeleteCurrentCalendar,
  onOpenAuth,
  onSignOut,
  currentUser,
  membership,
  isAdmin,
  canEdit = isAdmin,
  userGeneration = 1,
  onUpdateUserGeneration,
  todayHebrewDate,
  todayGregorianDate,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between w-full lg:w-auto shrink-0">
            <button
              onClick={() => onBackToHub && onBackToHub()}
              className="flex items-center gap-3 text-right hover:opacity-90 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif leading-none whitespace-nowrap">
                    זמנים משפחתיים
                  </h1>
                  <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-serif whitespace-nowrap">
                    לוח שנה משפחתי
                  </span>
                </div>
                {(todayHebrewDate || todayGregorianDate) ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1 whitespace-nowrap">
                    {todayHebrewDate && (
                      <span className="font-serif font-bold text-amber-950 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md">
                        {todayHebrewDate}
                      </span>
                    )}
                    {todayHebrewDate && todayGregorianDate && (
                      <span className="text-slate-300 font-semibold">•</span>
                    )}
                    {todayGregorianDate && (
                      <span className="text-slate-600 font-medium bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md">
                        {todayGregorianDate}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 hidden sm:block font-medium mt-0.5">
                    ימי זיכרון, שמחות ועץ משפחה בסנכרון אוטומטי ליומן גוגל
                  </p>
                )}
              </div>
            </button>

            {/* Mobile Auth Button */}
            <div className="lg:hidden">
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

          {/* Navigation & Controls Bar - Single Uniform Height Row */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap lg:flex-nowrap">
            {/* If NOT logged in: Show clear login action */}
            {!currentUser && (
              <button
                onClick={onOpenAuth}
                className="h-9 inline-flex items-center gap-2 px-4 text-xs font-bold text-white bg-gradient-to-l from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>כניסה למערכת / התחברות</span>
              </button>
            )}

            {/* If logged in: Show Calendar Controls */}
            {currentUser && (
              <>
                {/* Calendar Project Switcher (When calendars exist) */}
                {calendars.length > 0 && (
                  <div className="h-9 flex items-center bg-slate-100/90 rounded-xl px-2 border border-slate-200 shadow-inner shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
                    <select
                      className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-0.5 pl-1 max-w-[165px] truncate"
                      value={currentCalendar?.id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          if (onBackToHub) onBackToHub();
                        } else {
                          const selected = calendars.find((c) => c.id === val);
                          if (selected) onSelectCalendar(selected);
                        }
                      }}
                    >
                      <option value="">📂 כל היומנים שלי</option>
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {formatCalendarDisplayName(cal.name)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={onOpenNewCalendar}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition cursor-pointer mr-0.5"
                      title="צור פרויקט יומן משפחתי חדש"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Actions active ONLY when a specific calendar is open */}
                {currentCalendar && (
                  <>
                    {/* User Generation Selector Pill */}
                    <div className="h-9 flex items-center bg-amber-50/90 hover:bg-amber-100/90 border border-amber-300/80 rounded-xl px-2.5 text-xs text-amber-950 shadow-2xs transition shrink-0">
                      <GitCommit className="w-3.5 h-3.5 text-amber-700 ml-1 shrink-0" />
                      <span className="font-semibold text-[11px] text-amber-900 ml-1 whitespace-nowrap">הדור שלי:</span>
                      <select
                        value={userGeneration}
                        onChange={(e) => onUpdateUserGeneration && onUpdateUserGeneration(Number(e.target.value))}
                        className="bg-transparent font-bold text-amber-950 focus:outline-none cursor-pointer pr-0.5 text-xs font-serif"
                        title="קבע את שיוך הדור שלך בעץ המשפחה — כל הדורות במערכת יחושבו ביחס אליך"
                      >
                        <option value={3}>דור 3 (סבא / סבתא)</option>
                        <option value={2}>דור 2 (הורים)</option>
                        <option value={1}>
                          דור 1 (בעל היומן{currentUser?.name ? ` / ${currentUser.name.split(' ')[0]}` : ''})
                        </option>
                        <option value={0}>דור 0 (ילדים של בעל היומן)</option>
                        <option value={-1}>דור 1- (נכדים)</option>
                        <option value={-2}>דור 2- (נינים)</option>
                        <option value={-3}>דור 3- (בני נינים)</option>
                      </select>
                    </div>

                    {/* Family Branches (Admin Only) */}
                    {isAdmin && (
                      <button
                        onClick={onOpenBranches}
                        className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-300/80 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>ענפי משפחה</span>
                      </button>
                    )}

                    {/* Google Sync Button */}
                    <button
                      onClick={onOpenSync}
                      className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-bold text-blue-700 bg-blue-50/80 border border-blue-200/80 rounded-xl hover:bg-blue-100 transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>סנכרון ליומן</span>
                    </button>

                    {/* Primary Action: Add Deceased (Admin or Editor Only) */}
                    {canEdit && (
                      <button
                        onClick={onOpenAddDeceased}
                        className="h-9 inline-flex items-center gap-1.5 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm hover:shadow active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>הוסף נפטר</span>
                      </button>
                    )}
                  </>
                )}

                {/* If on Hub and has no calendar open, show Create Calendar button */}
                {!currentCalendar && (
                  <button
                    onClick={onOpenNewCalendar}
                    className="h-9 inline-flex items-center gap-1.5 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm hover:shadow active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>צור יומן חדש</span>
                  </button>
                )}

                {/* User Profile / Authentication Menu */}
                <div className="relative hidden lg:block shrink-0" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="h-9 flex items-center gap-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-[11px] flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="text-right leading-none max-w-[110px] truncate">
                      <span className="block text-[11px] font-bold text-slate-800 truncate">
                        {currentUser.name}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
                        {isAdmin ? 'מנהל יומן' : canEdit ? 'עורך מורשה' : 'צפייה בלבד'}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
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
                          ) : canEdit ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>הרשאת עריכה</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>צפייה בלבד</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onBackToHub) onBackToHub();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        >
                          <LayoutGrid className="w-4 h-4 text-slate-400" />
                          <span>מרכז היומנים שלי</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenNewCalendar();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-slate-400" />
                          <span>צור יומן משפחתי נוסף</span>
                        </button>

                        {currentCalendar && (
                          <div className="px-3 py-2 border-y border-slate-100 bg-amber-50/60 my-1 rounded-xl">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1 font-serif">
                                <GitCommit className="w-3.5 h-3.5 text-amber-700" />
                                <span>הדור שלי:</span>
                              </span>
                              <select
                                value={userGeneration}
                                onChange={(e) => onUpdateUserGeneration && onUpdateUserGeneration(Number(e.target.value))}
                                className="text-xs font-bold text-amber-950 bg-white border border-amber-300 rounded-lg px-2 py-0.5 cursor-pointer outline-none font-serif"
                              >
                                <option value={3}>דור 3 (סבים)</option>
                                <option value={2}>דור 2 (הורים)</option>
                                <option value={1}>דור 1 (בעל היומן)</option>
                                <option value={0}>דור 0 (ילדים)</option>
                                <option value={-1}>דור 1- (נכדים)</option>
                                <option value={-2}>דור 2- (נינים)</option>
                                <option value={-3}>דור 3- (בני נינים)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {currentCalendar && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenSync();
                            }}
                            className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-slate-400" />
                            <span>הגדרות סנכרון אישי</span>
                          </button>
                        )}

                        {currentCalendar && isAdmin && onOpenGemImport && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenGemImport();
                            }}
                            className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>ייבוא חכם (GEM / JSON)</span>
                          </button>
                        )}

                        {currentCalendar && isAdmin && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onDeleteCurrentCalendar) onDeleteCurrentCalendar();
                            }}
                            className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            <span>מחק יומן זה לצמיתות</span>
                          </button>
                        )}

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full text-right flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>התנתק מהחשבון</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
