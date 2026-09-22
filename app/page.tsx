'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { DeceasedList } from '@/components/DeceasedList';
import { DeceasedModal } from '@/components/DeceasedModal';
import { BranchManagerModal } from '@/components/BranchManagerModal';
import { GoogleSyncModal } from '@/components/GoogleSyncModal';
import { NewCalendarModal } from '@/components/NewCalendarModal';
import { AuthModal } from '@/components/AuthModal';
import { ShareCalendarModal } from '@/components/ShareCalendarModal';
import { DeleteCalendarConfirmModal } from '@/components/DeleteCalendarConfirmModal';
import { GemImportModal } from '@/components/GemImportModal';
import { FamilyTreeView } from '@/components/FamilyTreeView';
import { MissingDatesView } from '@/components/MissingDatesView';
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
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  LayoutGrid,
  LogIn,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Download,
  FolderTree,
  List,
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

  // Shared View State (When opened via ?share=true&calendarId=...&branches=...)
  const [sharedViewData, setSharedViewData] = useState<{
    calendar: CalendarProject;
    branches: FamilyBranch[];
    deceased: DeceasedPerson[];
    feedToken: string;
    selectedBranchIds: string[];
  } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNewCalendarModalOpen, setIsNewCalendarModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarProject | null>(null);
  const [editingDeceased, setEditingDeceased] = useState<DeceasedPerson | null>(null);
  const [isGemImportModalOpen, setIsGemImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'missing'>('list');

  const [loading, setLoading] = useState(true);

  // Check for shared link in URL upon mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const isShare = sp.get('share') === 'true' || sp.get('isShare') === 'true';
      const calId = sp.get('calendarId');
      const brParam = sp.get('branches') || '';

      if (isShare && calId) {
        fetch(`/api/data?isShare=true&calendarId=${calId}&branches=${brParam}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.calendar) {
              setSharedViewData(data);
            }
          })
          .catch((err) => console.error('Failed to load shared calendar:', err));
      }
    }
  }, []);

  // Initialize User from active Supabase / Google OAuth session or localStorage
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
          if (parsed.email === 'shalomyosefzeev@gmail.com') {
            parsed.name = 'ספי רייכקינד';
            parsed.avatar = 'https://lh3.googleusercontent.com/a/ACg8ocLlT2SSbn2pbTojfDgn91p_5omwts52h6mrf5LPk8TuPp7lC1lu=s96-c';
            localStorage.setItem('ner_neshama_user', JSON.stringify(parsed));
          }
          if (isMounted) {
            setCurrentUser(parsed);
          }
          return;
        }
      } catch {}

      // If no stored session, user is strictly an unauthenticated guest
      if (isMounted) {
        setCurrentUser(null);
        setLoading(false);
      }
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

  // Fetch calendars list for the authenticated user
  const loadUserCalendars = async () => {
    if (!currentUser) {
      setCalendars([]);
      setCurrentCalendar(null);
      setBranches([]);
      setDeceased([]);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        userEmail: currentUser.email,
        userName: currentUser.name,
      });

      const res = await fetch(`/api/data?${queryParams.toString()}`);
      const data = await res.json();

      if (data.calendars) {
        setCalendars(data.calendars);
      }
    } catch (err) {
      console.error('Error loading user calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full details of a specific calendar
  const loadCalendarDetails = async (calendarId: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        userEmail: currentUser.email,
        userName: currentUser.name,
        calendarId,
      });

      const res = await fetch(`/api/data?${queryParams.toString()}`);
      const data = await res.json();

      if (data.calendar) {
        setCurrentCalendar(data.calendar);
        setBranches(data.branches || []);
        setDeceased(data.deceased || []);
        if (data.membership) {
          setMembership(data.membership);
        }
      }
    } catch (err) {
      console.error('Error loading calendar details:', err);
    } finally {
      setLoading(false);
    }
  };

  // When currentUser changes, reload calendars
  useEffect(() => {
    if (currentUser) {
      loadUserCalendars();
    } else {
      setCalendars([]);
      setCurrentCalendar(null);
      setBranches([]);
      setDeceased([]);
      setMembership(null);
      setLoading(false);
    }
  }, [currentUser]);

  // Handle switching or selecting a calendar
  const handleSelectCalendar = async (cal: CalendarProject) => {
    await loadCalendarDetails(cal.id);
  };

  // Handle returning to Calendars Hub
  const handleBackToHub = () => {
    setCurrentCalendar(null);
    setBranches([]);
    setDeceased([]);
    setMembership(null);
    loadUserCalendars();
  };

  // Delete an entire calendar
  const handleConfirmDeleteCalendar = async (calendarId: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_calendar',
        payload: { calendarId },
        userEmail: currentUser.email,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'שגיאה במחיקת היומן');
    }

    if (currentCalendar?.id === calendarId) {
      setCurrentCalendar(null);
    }
    await loadUserCalendars();
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
      await loadCalendarDetails(currentCalendar.id);
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
      await loadCalendarDetails(currentCalendar.id);
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
    await loadCalendarDetails(currentCalendar.id);
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
    await loadCalendarDetails(currentCalendar.id);
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
      setIsNewCalendarModalOpen(false);
      // Immediately open the newly created calendar
      await loadCalendarDetails(data.calendar.id);
      await loadUserCalendars();
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
    supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentCalendar(null);
    setCalendars([]);
  };

  const handleAuthSuccess = (user: { email: string; name: string; avatar?: string | null }) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Find upcoming yahrzeits in the next 30 days for active calendar or shared view
  const targetDeceased = sharedViewData ? sharedViewData.deceased : deceased;
  const isViewingSomething = Boolean(currentCalendar || sharedViewData);

  const upcomingThisMonth = useMemo(() => {
    if (!isViewingSomething || targetDeceased.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);

    return targetDeceased
      .map((d) => {
        if (!d.hebrew_day || !d.hebrew_month) return null;
        try {
          const upList = calculateUpcomingYahrzeits(d, 1);
          const up = upList && upList.length > 0 ? upList[0] : null;
          if (!up) return null;
          const eventDate = new Date(up.gregorianDate);
          eventDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return { deceased: d, upcoming: up, diffDays };
        } catch {
          return null;
        }
      })
      .filter((item): item is { deceased: DeceasedPerson; upcoming: any; diffDays: number } => {
        return item !== null && item.diffDays >= 0 && item.diffDays <= 30;
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [targetDeceased, isViewingSomething]);

  const missingDatesCount = useMemo(() => {
    return deceased.filter(p => !p.hebrew_day || !p.hebrew_month).length;
  }, [deceased]);

  const webcalFeedUrl = useMemo(() => {
    if (!membership?.feed_token) return '';
    const host = typeof window !== 'undefined' ? window.location.host : 'yahrzeit-calendar.vercel.app';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const protocol = isHttps ? 'webcal:' : 'http:';
    return `${protocol}//${host}/api/calendar/${membership.feed_token}`;
  }, [membership]);

  const googleCalendarSubscribeUrl = useMemo(() => {
    if (!webcalFeedUrl) return '';
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalFeedUrl)}`;
  }, [webcalFeedUrl]);

  const icsDownloadUrl = useMemo(() => {
    if (!membership?.feed_token) return '';
    return `/api/calendar/${membership.feed_token}`;
  }, [membership]);

  const isAdmin = Boolean(currentUser && membership?.role === 'admin');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Top Header Bar */}
      <Header
        calendars={calendars}
        currentCalendar={currentCalendar}
        onSelectCalendar={handleSelectCalendar}
        onBackToHub={handleBackToHub}
        onOpenNewCalendar={() => setIsNewCalendarModalOpen(true)}
        onOpenBranches={() => setIsBranchesModalOpen(true)}
        onOpenAddDeceased={() => {
          setEditingDeceased(null);
          setIsAddModalOpen(true);
        }}
        onOpenGemImport={() => setIsGemImportModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onDeleteCurrentCalendar={() => {
          if (currentCalendar) {
            setCalendarToDelete(currentCalendar);
            setIsDeleteModalOpen(true);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
        membership={membership}
        isAdmin={isAdmin}
        todayHebrewDate={todayHebrewDate}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ========================================================================= */}
        {/* VIEW 0: SHARED VIEW MODE (WHEN VISITING VIA SELECTIVE SHARE LINK)        */}
        {/* ========================================================================= */}
        {sharedViewData && (
          <div className="space-y-8">
            {/* Shared View Notice Bar */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  תצוגת יומן משותפת: מוצגים אך ורק ענפי המשפחה שנבחרו עבורך ({sharedViewData.branches.map((b) => b.name).join(' • ')})
                </span>
              </div>
              <button
                onClick={() => {
                  setSharedViewData(null);
                  window.history.replaceState({}, '', '/');
                }}
                className="text-indigo-700 hover:text-indigo-900 font-bold hover:underline cursor-pointer"
              >
                חזרה לדף הראשי &larr;
              </button>
            </div>

            {/* Shared Calendar Hero */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden border border-slate-800">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold font-serif">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>היום: {todayHebrewDate}</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black font-serif text-slate-50">
                    {sharedViewData.calendar.name}
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                    יומן ימי פטירה (יארצייט) מסונכרן. ענפים משותפים: {sharedViewData.branches.map((b) => b.name).join(', ')}.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
                  <div className="flex-1 sm:flex-initial bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[105px]">
                    <span className="text-2xl font-black text-white block">{sharedViewData.deceased.length}</span>
                    <span className="text-[11px] text-slate-300 font-bold">נפטרים בענף</span>
                  </div>

                  <a
                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                      `${typeof window !== 'undefined' && window.location.origin.startsWith('https') ? 'webcal:' : 'http:'}//${
                        typeof window !== 'undefined' ? window.location.host : 'yahrzeit-calendar.vercel.app'
                      }/api/calendar/${sharedViewData.feedToken}?branches=${sharedViewData.selectedBranchIds.join(',')}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition rounded-2xl px-5 py-4 text-center font-extrabold text-xs shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>סנכרן ענף זה ל-Google Calendar</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Upcoming Yahrzeits for Shared Branches */}
            {upcomingThisMonth.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
                    <BellRing className="w-5 h-5 text-amber-600 animate-bounce" />
                    <span className="font-serif font-black text-lg">
                      אזכרות וימי פטירה ב-30 הימים הקרובים ({upcomingThisMonth.length})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full font-serif">
                    זכרון להולכים
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {upcomingThisMonth.map(({ deceased: person, upcoming, diffDays }) => (
                    <div
                      key={person.id}
                      className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3"
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

            {/* Read-Only Deceased List */}
            <DeceasedList
              deceased={sharedViewData.deceased}
              branches={sharedViewData.branches}
              isAdmin={false}
              onEdit={() => {}}
              onDelete={async () => {}}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: UNAUTHENTICATED GUEST LANDING PAGE (NO DATA LEAKAGE)             */}
        {/* ========================================================================= */}
        {!currentUser && !sharedViewData && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden border border-slate-800 text-center">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                {/* Hebrew Date Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-md border border-white/10 shadow-xs font-serif">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>היום: {todayHebrewDate || 'לוח השנה העברי'}</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-serif text-slate-50">
                  נר נשמה &bull; לוח הנצחה וימי פטירה משפחתיים
                </h2>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium max-w-2xl mx-auto">
                  מערכת אישית ומכובדת לניהול ימי פטירה (יארצייט) לפי לוח השנה העברי, התחשבות בשקיעת החמה, חלוקה לענפי משפחה וסנכרון ישיר ל-Google Calendar.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>כניסה והרשמה למערכת</span>
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
                          },
                        });
                      } catch {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-white/10 hover:bg-white/15 text-slate-100 rounded-2xl font-bold text-sm backdrop-blur-md border border-white/15 transition cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>התחברות באמצעות Google</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dignified Jewish Quote */}
            <div className="text-center font-serif text-slate-700 italic text-sm sm:text-base">
              ״זֵכֶר צַדִּיק לִבְרָכָה — מַעֲשִׂים טוֹבִים וְזִכָּרוֹן חַי לְעִלּוּי נִשְׁמַת יַקִּירֵינוּ״
            </div>

            {/* 4 Core Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">חישוב עברי והלכתי מדויק</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  התחשבות אוטומטית בשקיעת החמה, הבחנה בין אדר א' לאדר ב' בשנה מעוברת, וציון מניין השנים שחלפו (״שנת העשרים״).
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">סנכרון ל-Google Calendar</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  חיבור רציף של ימי הפטירה ישירות ליומן האישי במחשב ובסמארטפון עם תזכורות שקטות ומכובדות מראש.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">חלוקה לענפי משפחה ושיתוף חלקי</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  חלוקת הנפטרים לפי ענפי המשפחה, ואפשרות לשתף רק חצי מהיומן (ענף מסוים בלבד) עם בני הדודים.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">פרטיות והפרדה מלאה</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  כל משתמש מנהל יומנים נפרדים. אפשרות למחוק יומן שלם בכל עת ושליטה מלאה על הרשאות הגישה.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LOGGED IN BUT NO CALENDARS CREATED YET (ONBOARDING)               */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && calendars.length === 0 && !loading && (
          <div className="max-w-2xl mx-auto space-y-6 text-center py-10">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Flame className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200/80">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>ברוך הבא למערכת, {currentUser.name}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black tracking-tight font-serif text-slate-900">
                עדיין לא הגדרת יומן זיכרון משפחתי
              </h2>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
                ביומן תוכל להוסיף את יקיריך, לחלק לענפי משפחה (צד אבא, צד אמא ועוד), לשתף חלקי יומן עם בני משפחה, ולקבל תזכורות אוטומטיות ליומן Google.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setIsNewCalendarModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-l from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-700/20 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>צור יומן משפחתי ראשון</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: LOGGED IN & AT CALENDARS HUB ("כל היומנים שלי")                   */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && !currentCalendar && calendars.length > 0 && (
          <div className="space-y-6">
            {/* Hub Banner */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold font-serif">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>היום: {todayHebrewDate}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-50">
                  מרכז היומנים המשפחתיים שלי
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  שלום {currentUser.name}, בחר יומן משפחתי לצפייה ולניהול, שתף ענפים ספציפיים או פתח יומן חדש:
                </p>
              </div>

              <button
                onClick={() => setIsNewCalendarModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/30 transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>צור יומן חדש</span>
              </button>
            </div>

            {/* Calendars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {calendars.map((cal) => {
                const isOwner = cal.created_by_user_id === currentUser.email;
                return (
                  <div
                    key={cal.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 group relative"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <Flame className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                              isOwner
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isOwner ? 'מנהל ראשי' : 'חבר משפחה'}
                          </span>

                          {/* Delete Calendar Button (Owner Only) */}
                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCalendarToDelete(cal);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                              title="מחק יומן זה לצמיתות"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="font-serif font-black text-xl text-slate-900 group-hover:text-blue-700 transition">
                        {cal.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {cal.description || 'יומן זיכרון והנצחה משפחתי מסונכרן ליומן גוגל.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                        <span>{cal.deceased_count ?? 0} נפטרים רשומים</span>
                        <span>{cal.branches_count ?? 0} ענפי משפחה</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectCalendar(cal)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          <span>פתח יומן</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            await handleSelectCalendar(cal);
                            setIsShareModalOpen(true);
                          }}
                          className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-bold text-xs transition cursor-pointer"
                          title="שתף יומן זה לפי ענפים"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add New Calendar Card */}
              <button
                onClick={() => setIsNewCalendarModalOpen(true)}
                className="bg-slate-50/70 hover:bg-blue-50/50 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-3 transition cursor-pointer min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <span className="block font-serif font-bold text-base text-slate-800">
                    יצירת יומן משפחתי נוסף
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    הקמת לוח זיכרון חדש לענף או משפחה נוספת
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ACTIVE SPECIFIC CALENDAR VIEW                                    */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && currentCalendar && (
          <div className="space-y-8">
            {/* Top Navigation & Calendar Actions Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <button
                onClick={handleBackToHub}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לכל היומנים שלי</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Smart GEM Import Button (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={() => setIsGemImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                    title="ייבוא חכם של נפטרים וענפים מ-GEM או מ-JSON"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>ייבוא חכם (GEM)</span>
                  </button>
                )}

                {/* Share Calendar Button */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>שתף יומן (לפי ענפים)</span>
                </button>

                {/* Delete Calendar Button (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCalendarToDelete(currentCalendar);
                      setIsDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition cursor-pointer"
                    title="מחק יומן זה לצמיתות"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">מחק יומן</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dignified Calendar Hero Section */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
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
                    {currentCalendar.name}
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                    {currentCalendar.description ||
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

                  {missingDatesCount > 0 && (
                    <button
                      onClick={() => setViewMode('missing')}
                      className="flex-1 sm:flex-initial bg-amber-500/20 hover:bg-amber-500/30 transition backdrop-blur-md rounded-2xl p-4 border border-amber-400/40 text-center min-w-[105px] cursor-pointer"
                      title="לחץ לצפייה בדמויות ברובריקת ללא תאריך"
                    >
                      <span className="text-2xl font-black text-amber-300 block">{missingDatesCount}</span>
                      <span className="text-[11px] text-amber-200 font-bold">ללא תאריך</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition rounded-2xl px-5 py-4 text-center font-extrabold text-xs shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>שתף יומן זה</span>
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode Navigation Tabs & 1-Click Sync Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>רשימת אזכרות</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
                    {deceased.length}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ${
                    viewMode === 'tree'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>עץ המשפחה והדורות</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                    דורות 1-8
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('missing')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ${
                    viewMode === 'missing'
                      ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>רובריקת ״ללא תאריך״</span>
                  {missingDatesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950">
                      {missingDatesCount} להשלמה
                    </span>
                  )}
                </button>
              </div>

              {/* 1-Click All Events to Google Calendar / ICS Download */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                {googleCalendarSubscribeUrl && (
                  <a
                    href={googleCalendarSubscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition transform hover:scale-[1.01] active:scale-95 cursor-pointer"
                    title="בלחיצה אחת: כל ימי הפטירה יתווספו יחד ליומן גוגל שלך, כולל תואר, קרבה ודור"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>סנכרן את כל האזכרות ל-Google Calendar</span>
                  </a>
                )}

                {icsDownloadUrl && (
                  <a
                    href={icsDownloadUrl}
                    download="yahrzeits.ics"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                    title="הורד קובץ יומן מלא (ICS) עבור Apple Calendar, Outlook או סמארטפון"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">הורד קובץ ICS</span>
                  </a>
                )}
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
                            {person.title ? `${person.title} ` : ''}{person.first_name} {person.last_name} ז״ל
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

            {/* View Mode Switching: List / Tree / Missing Rubric */}
            {viewMode === 'list' && (
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
            )}

            {viewMode === 'tree' && (
              <FamilyTreeView
                deceased={deceased}
                branches={branches}
                onEditDeceased={(person) => {
                  setEditingDeceased(person);
                  setIsAddModalOpen(true);
                }}
                onAddDeceased={(initial) => {
                  setEditingDeceased(initial as any);
                  setIsAddModalOpen(true);
                }}
              />
            )}

            {viewMode === 'missing' && (
              <MissingDatesView
                deceased={deceased}
                branches={branches}
                onEditDeceased={(person) => {
                  setEditingDeceased(person);
                  setIsAddModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 mt-12 space-y-1">
        <p className="font-semibold text-slate-700 font-serif">
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

      {currentCalendar && (
        <>
          <DeceasedModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingDeceased(null);
            }}
            onSave={handleSaveDeceased}
            branches={branches}
            initialData={editingDeceased}
            calendarId={currentCalendar.id}
          />

          <BranchManagerModal
            isOpen={isBranchesModalOpen}
            onClose={() => setIsBranchesModalOpen(false)}
            branches={branches}
            deceased={deceased}
            calendarId={currentCalendar.id}
            onAddBranch={handleAddBranch}
            onDeleteBranch={handleDeleteBranch}
          />

          <GoogleSyncModal
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
            branches={branches}
            membership={membership}
            calendarName={currentCalendar.name}
            onUpdateBranches={handleUpdateMembershipBranches}
          />

          <ShareCalendarModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            calendar={currentCalendar}
            branches={branches}
            deceased={deceased}
            feedToken={membership?.feed_token}
          />

          <GemImportModal
            isOpen={isGemImportModalOpen}
            onClose={() => setIsGemImportModalOpen(false)}
            calendarId={currentCalendar.id}
            userEmail={currentUser?.email || ''}
            onImportSuccess={(newBranches, newDeceased) => {
              setBranches(newBranches);
              setDeceased(newDeceased);
            }}
          />
        </>
      )}

      {/* Global Delete Calendar Modal */}
      <DeleteCalendarConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCalendarToDelete(null);
        }}
        calendar={calendarToDelete}
        onConfirmDelete={handleConfirmDeleteCalendar}
      />

      <NewCalendarModal
        isOpen={isNewCalendarModalOpen}
        onClose={() => setIsNewCalendarModalOpen(false)}
        onCreateCalendar={handleCreateCalendar}
        currentUserName={currentUser?.name || 'משתמש'}
      />
    </div>
  );
}
