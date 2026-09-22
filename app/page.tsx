'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { DeceasedList } from '@/components/DeceasedList';
import { DeceasedModal } from '@/components/DeceasedModal';
import { BranchManagerModal } from '@/components/BranchManagerModal';
import { GoogleSyncModal } from '@/components/GoogleSyncModal';
import { NewCalendarModal } from '@/components/NewCalendarModal';
import { AuthModal } from '@/components/AuthModal';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from '@/lib/types';
import { calculateUpcomingYahrzeits, formatAnniversaryYearText, getGoogleCalendarDirectAddUrl } from '@/lib/hebrew-calendar';
import { supabase } from '@/lib/supabase';
import { HDate } from '@hebcal/core';
import {
  Flame,
  Calendar as CalendarIcon,
  Users,
  BellRing,
  Share2,
  Sparkles,
  ShieldCheck,
  Clock,
  Plus,
} from 'lucide-react';

export default function HomePage() {
  // Current User State - dynamically resolved from Google/Supabase Auth
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    name: string;
    avatar?: string | null;
  } | null>(null);

  // App Data State
  const [calendars, setCalendars] = useState<CalendarProject[]>([]);
  const [currentCalendar, setCurrentCalendar] = useState<CalendarProject | null>(null);
  const [branches, setBranches] = useState<FamilyBranch[]>([]);
  const [deceased, setDeceased] = useState<DeceasedPerson[]>([]);
  const [membership, setMembership] = useState<UserMembership | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNewCalendarModalOpen, setIsNewCalendarModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingDeceased, setEditingDeceased] = useState<DeceasedPerson | null>(null);

  const [loading, setLoading] = useState(true);

  // Initialize User from active Supabase / Google OAuth session
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // 1. Check if user is signed in via Supabase (e.g. Google OAuth)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const googleFullName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'משתמש';

          const googleUser = {
            email: session.user.email || '',
            name: googleFullName,
            avatar: (session.user.user_metadata?.avatar_url as string) || null,
          };

          if (isMounted) {
            setCurrentUser(googleUser);
            localStorage.setItem('ner_neshama_user', JSON.stringify(googleUser));
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase auth session check notice:', err);
      }

      // 2. Check local storage if no active Supabase session
      try {
        const stored = localStorage.getItem('ner_neshama_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          // If stored name is the old hardcoded 'שלום יוסף זאב' placeholder, clean it to email username
          if (parsed.name === 'שלום יוסף זאב' && parsed.email) {
            parsed.name = parsed.email.split('@')[0];
            localStorage.setItem('ner_neshama_user', JSON.stringify(parsed));
          }
          if (isMounted) {
            setCurrentUser(parsed);
          }
        }
      } catch {}
    };

    initAuth();

    // 3. Listen to Supabase Auth state changes (Google OAuth callback redirect)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const googleFullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] ||
          'משתמש';

        const googleUser = {
          email: session.user.email || '',
          name: googleFullName,
          avatar: (session.user.user_metadata?.avatar_url as string) || null,
        };
        setCurrentUser(googleUser);
        localStorage.setItem('ner_neshama_user', JSON.stringify(googleUser));
      } else if (_event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('ner_neshama_user');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Today's Hebrew date string
  const todayHebrewDate = useMemo(() => {
    try {
      const hd = new HDate();
      return hd.render('he');
    } catch {
      return '';
    }
  }, []);

  // Load data for calendar
  const loadData = async (calendarId?: string) => {
    try {
      const userEmail = currentUser?.email || 'shalomyosefzeev@gmail.com';
      const userName = currentUser?.name || 'אורח';
      const queryParams = new URLSearchParams({
        userEmail,
        userName,
      });
      if (calendarId) {
        queryParams.set('calendarId', calendarId);
      }

      const res = await fetch(`/api/data?${queryParams.toString()}`);
      const data = await res.json();

      if (data.calendars && data.calendars.length > 0) {
        setCalendars(data.calendars);
        const selected = calendarId
          ? data.calendars.find((c: CalendarProject) => c.id === calendarId) || data.calendars[0]
          : data.calendars[0];

        setCurrentCalendar(selected);
        setBranches(data.branches || []);
        setDeceased(data.deceased || []);
        if (data.membership) {
          setMembership(data.membership);
        }
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSelectCalendar = async (cal: CalendarProject) => {
    setCurrentCalendar(cal);
    await loadData(cal.id);
  };

  // Add or update deceased with conflict check
  const handleSaveDeceased = async (
    deceasedData: Partial<DeceasedPerson>,
    forceConfirm: boolean = false
  ) => {
    const action = deceasedData.id ? 'update_deceased' : 'add_deceased';
    const payload = deceasedData.id
      ? { id: deceasedData.id, updates: deceasedData, forceConfirm }
      : { deceased: deceasedData, forceConfirm };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        payload,
        userEmail: currentUser?.email,
      }),
    });

    const data = await res.json();
    if (res.status === 409 && data.conflict) {
      return data;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save');
    }

    if (currentCalendar) {
      await loadData(currentCalendar.id);
    }
  };

  const handleDeleteDeceased = async (id: string) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_deceased',
        payload: { id },
        userEmail: currentUser?.email,
      }),
    });
    if (currentCalendar) {
      await loadData(currentCalendar.id);
    }
  };

  const handleAddBranch = async (name: string, color: string) => {
    if (!currentCalendar) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_branch',
        payload: { calendar_id: currentCalendar.id, name, color },
        userEmail: currentUser?.email,
      }),
    });
    await loadData(currentCalendar.id);
  };

  const handleDeleteBranch = async (id: string) => {
    if (!currentCalendar) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_branch',
        payload: { id },
        userEmail: currentUser?.email,
      }),
    });
    await loadData(currentCalendar.id);
  };

  const handleCreateCalendar = async (name: string, description: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_calendar',
        payload: {
          name,
          description,
          user_name: currentUser.name,
          user_email: currentUser.email,
        },
      }),
    });
    const data = await res.json();
    if (data.success && data.calendar) {
      await loadData(data.calendar.id);
    }
  };

  const handleUpdateMembershipBranches = async (selectedBranchIds: string[]) => {
    if (!membership || !currentCalendar) return;
    const updated = { ...membership, selected_branch_ids: selectedBranchIds };
    setMembership(updated);

    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_membership',
        payload: { membership: updated },
        userEmail: currentUser?.email,
      }),
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('ner_neshama_user');
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: { email: string; name: string; avatar?: string | null }) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Find upcoming yahrzeits in the next 30 days
  const upcomingThisMonth = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);

    return deceased
      .map((d) => {
        const up = calculateUpcomingYahrzeits(d, 1)[0];
        if (!up) return null;
        const eventDate = new Date(up.gregorianDate);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { deceased: d, upcoming: up, diffDays };
      })
      .filter((item): item is { deceased: DeceasedPerson; upcoming: any; diffDays: number } => {
        return item !== null && item.diffDays >= 0 && item.diffDays <= 30;
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [deceased]);

  const isAdmin = membership?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header Bar */}
      <Header
        calendars={calendars}
        currentCalendar={currentCalendar}
        onSelectCalendar={handleSelectCalendar}
        onOpenNewCalendar={() => setIsNewCalendarModalOpen(true)}
        onOpenBranches={() => setIsBranchesModalOpen(true)}
        onOpenAddDeceased={() => {
          setEditingDeceased(null);
          setIsAddModalOpen(true);
        }}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
        membership={membership}
        isAdmin={isAdmin}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Dignified Hero Section */}
        <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
          {/* Subtle Atmospheric Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              {/* Hebrew Date Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-md border border-white/10 shadow-xs font-serif">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>היום: {todayHebrewDate || 'לוח השנה העברי'}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight font-serif text-slate-50">
                {currentCalendar?.name || 'טוען יומן משפחתי...'}
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                {currentCalendar?.description ||
                  'ניהול ימי פטירה (יארצייט) של אבות המשפחה לפי לוח השנה העברי, חלוקה לענפי משפחה וסנכרון אוטומטי ליומן גוגל.'}
              </p>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              <div className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 transition backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[105px]">
                <span className="text-2xl font-black text-white block">{deceased.length}</span>
                <span className="text-[11px] text-slate-300 font-bold">נפטרים ביומן</span>
              </div>

              <div className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 transition backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[105px]">
                <span className="text-2xl font-black text-amber-400 block">{branches.length}</span>
                <span className="text-[11px] text-slate-300 font-bold">ענפי משפחה</span>
              </div>

              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition rounded-2xl px-5 py-4 text-center font-extrabold text-xs shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>סנכרן ליומן שלי</span>
              </button>
            </div>
          </div>
        </div>

        {/* 30-Day Upcoming Yahrzeits Highlight Ribbon */}
        {upcomingThisMonth.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
                <BellRing className="w-5 h-5 text-amber-600 animate-bounce" />
                <span className="font-serif font-black text-lg">אזכרות וימי פטירה ב-30 הימים הקרובים ({upcomingThisMonth.length})</span>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full font-serif">
                זכרון להולכים
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {upcomingThisMonth.map(({ deceased: person, upcoming, diffDays }) => (
                <div
                  key={person.id}
                  className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-lg font-black text-slate-900 block leading-tight font-serif">
                        {person.first_name} {person.last_name} ז״ל
                      </span>
                      {person.father_or_mother_name && (
                        <span className="text-[11px] text-slate-600 font-semibold block mt-0.5 font-serif">
                          לעילוי נשמת {person.father_or_mother_name}
                        </span>
                      )}
                      <span className="text-sm font-bold text-amber-900 block mt-1.5 font-serif">
                        {upcoming.hebrewDateStr} &bull;{' '}
                        {new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'numeric',
                        })}
                      </span>
                    </div>

                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 shrink-0">
                      {diffDays === 0 ? 'היום!' : diffDays === 1 ? 'מחר!' : `בעוד ${diffDays} ימים`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 font-serif">
                      {formatAnniversaryYearText(upcoming.yearsPassed)}
                    </span>
                    <a
                      href={getGoogleCalendarDirectAddUrl(person, upcoming)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                    >
                      <CalendarIcon className="w-3 h-3 text-blue-600" />
                      <span>הוסף ליומן</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deceased List Grid with Search & Branch Filters */}
        <DeceasedList
          deceased={deceased}
          branches={branches}
          isAdmin={isAdmin}
          onEdit={(person) => {
            setEditingDeceased(person);
            setIsAddModalOpen(true);
          }}
          onDelete={handleDeleteDeceased}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 mt-12 space-y-1">
        <p className="font-semibold text-slate-700">
          מערכת ״נר נשמה״ לניהול ימי פטירה משפחתיים &bull; מחושב לפי לוח השנה העברי ושקיעת החמה
        </p>
        <p className="text-[11px] text-slate-400">
          כל הזכויות שמורות &bull; תמיכה מלאה ב-Google Calendar, Apple Calendar ו-Outlook
        </p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <DeceasedModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDeceased(null);
        }}
        onSave={handleSaveDeceased}
        branches={branches}
        initialData={editingDeceased}
        calendarId={currentCalendar?.id || '11111111-1111-1111-1111-111111111111'}
      />

      <BranchManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        branches={branches}
        deceased={deceased}
        calendarId={currentCalendar?.id || '11111111-1111-1111-1111-111111111111'}
        onAddBranch={handleAddBranch}
        onDeleteBranch={handleDeleteBranch}
      />

      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        branches={branches}
        membership={membership}
        calendarName={currentCalendar?.name || ''}
        onUpdateBranches={handleUpdateMembershipBranches}
      />

      <NewCalendarModal
        isOpen={isNewCalendarModalOpen}
        onClose={() => setIsNewCalendarModalOpen(false)}
        onCreateCalendar={handleCreateCalendar}
        currentUserName={currentUser?.name || 'שלום יוסף זאב'}
      />
    </div>
  );
}
