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
import { JoinBranchModal } from '@/components/JoinBranchModal';
import { FamilyTreeView } from '@/components/FamilyTreeView';
import { MissingDatesView } from '@/components/MissingDatesView';
import { HebrewBirthdaysView } from '@/components/HebrewBirthdaysView';
import { TreePositionModal } from '@/components/TreePositionModal';
import { HebrewCalendarSyncModal } from '@/components/HebrewCalendarSyncModal';
import LineageModal from '@/components/LineageModal';
import {
  getHebrewCalendarLivePreview,
  DEFAULT_HEBREW_CALENDAR_OPTIONS,
} from '@/lib/hebrew-dates-calendar';
import {
  CalendarProject,
  FamilyBranch,
  DeceasedPerson,
  UserMembership,
  LinkedBranchSource,
} from '@/lib/types';
import {
  calculateUpcomingYahrzeits,
  formatAnniversaryYearText,
  getGoogleCalendarDirectAddUrl,
  getDeceasedFullName,
  formatHebrewDateString,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
  formatCalendarDisplayName,
  formatCalendarDescription,
  isPersonLiving,
  getHalachicYahrzeitTimes,
  UserTreePosition,
  extractUserTreePosition,
  applyUserTreePositionToTokens,
  formatUserTreePositionLabel,
} from '@/lib/hebrew-calendar';
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
  GitCommit,
  ChevronDown,
  ChevronUp,
  Pencil,
  Link2,
  Cake,
  Sunset,
  MapPin,
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
  const [calendarMembers, setCalendarMembers] = useState<UserMembership[]>([]);
  const [linkedSources, setLinkedSources] = useState<LinkedBranchSource[]>([]);
  const [userGeneration, setUserGeneration] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ner_neshama_user_generation');
      if (saved !== null && !isNaN(Number(saved))) return Number(saved);
    }
    return 1;
  });
  const [userTreePosition, setUserTreePosition] = useState<UserTreePosition>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ner_neshama_user_tree_position');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.userGeneration === 'number') return parsed;
          if (parsed && typeof parsed.userGen === 'number') {
            return { ...parsed, userGeneration: parsed.userGen };
          }
        }
      } catch {}
    }
    return { userGeneration: 1, relationType: 'general' };
  });
  const [isTreePositionModalOpen, setIsTreePositionModalOpen] = useState(false);

  // Shared View State (When opened via ?share=true&calendarId=...&branches=...)
  const [sharedViewData, setSharedViewData] = useState<{
    calendar: CalendarProject;
    branches: FamilyBranch[];
    deceased: DeceasedPerson[];
    feedToken: string;
    selectedBranchIds: string[];
    membership?: UserMembership | null;
  } | null>(null);
  const [sharedMaxGen, setSharedMaxGen] = useState<string>('all');
  const [sharedSkippedGens, setSharedSkippedGens] = useState<number[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultModalIsLiving, setDefaultModalIsLiving] = useState(false);
  const [defaultModalSimchaType, setDefaultModalSimchaType] = useState<'birthday' | 'anniversary' | 'simcha'>('birthday');
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalInitialTab, setShareModalInitialTab] = useState<'share' | 'members'>('share');
  const [isNewCalendarModalOpen, setIsNewCalendarModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarProject | null>(null);
  const [editingDeceased, setEditingDeceased] = useState<DeceasedPerson | null>(null);
  const [isGemImportModalOpen, setIsGemImportModalOpen] = useState(false);
  const [isJoinBranchModalOpen, setIsJoinBranchModalOpen] = useState(false);
  const [isHebrewCalendarModalOpen, setIsHebrewCalendarModalOpen] = useState(false);
  const [joinModalPreselect, setJoinModalPreselect] = useState<{
    calId?: string;
    branchIds?: string[];
    autoApprove?: boolean;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'birthdays' | 'missing'>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlView = sp.get('view');
      if (urlView === 'list' || urlView === 'tree' || urlView === 'birthdays' || urlView === 'missing') {
        return urlView;
      }
      const savedView = localStorage.getItem('ner_neshama_active_view_mode');
      if (savedView === 'list' || savedView === 'tree' || savedView === 'birthdays' || savedView === 'missing') {
        return savedView;
      }
    }
    return 'list';
  });
  const [lineagePerson, setLineagePerson] = useState<DeceasedPerson | null>(null);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isEditingCalendarInfo, setIsEditingCalendarInfo] = useState(false);
  const [editCalendarName, setEditCalendarName] = useState('');
  const [editCalendarDescription, setEditCalendarDescription] = useState('');
  const [isSavingCalendarInfo, setIsSavingCalendarInfo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingCalendarInfo, setLoadingCalendarInfo] = useState<{ id: string; name?: string } | null>(null);

  // Sync viewMode with localStorage and URL query parameter when inside a calendar
  useEffect(() => {
    if (typeof window !== 'undefined' && currentCalendar) {
      localStorage.setItem('ner_neshama_active_view_mode', viewMode);
      const sp = new URLSearchParams(window.location.search);
      const isShare = sp.get('share') === 'true' || sp.get('isShare') === 'true';
      if (!isShare) {
        sp.set('calendarId', currentCalendar.id);
        if (viewMode !== 'list') {
          sp.set('view', viewMode);
        } else {
          sp.delete('view');
        }
        const qs = sp.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      }
    }
  }, [viewMode, currentCalendar]);

  // Check for shared link in URL upon mount or when currentUser logs in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const isShare = sp.get('share') === 'true' || sp.get('isShare') === 'true';
      const calId = sp.get('calendarId');
      const brParam = sp.get('branches') || '';
      const roleParam = sp.get('role') || '';
      const urlMaxGen = sp.get('maxGen');
      const urlSkipGens = sp.get('skipGens');
      if (urlMaxGen) setSharedMaxGen(urlMaxGen);
      if (urlSkipGens) {
        const parsed = urlSkipGens
          .split(',')
          .map((x) => Number(x.trim()))
          .filter((n) => !Number.isNaN(n));
        setSharedSkippedGens(parsed);
      }

      if (isShare && calId) {
        const q = new URLSearchParams({
          isShare: 'true',
          calendarId: calId,
          branches: brParam,
        });
        if (roleParam) q.set('role', roleParam);
        if (currentUser?.email) {
          q.set('userEmail', currentUser.email);
          q.set('userName', currentUser.name);
        }

        fetch(`/api/data?${q.toString()}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.calendar) {
              setSharedViewData(data);
              if (data.membership) {
                setMembership(data.membership);
              }
            }
          })
          .catch((err) => console.error('Failed to load shared calendar:', err));
      }
    }
  }, [currentUser]);

  // Initialize User from active Supabase / Google OAuth session or localStorage
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host && host !== 'family-zmanim.vercel.app' && host !== 'localhost' && host !== '127.0.0.1') {
          window.location.replace(
            'https://family-zmanim.vercel.app' +
              window.location.pathname +
              window.location.search +
              window.location.hash
          );
          return;
        }

        // Handle OAuth hash callback (#access_token=...) explicitly
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          try {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token') || '';
            if (accessToken) {
              if (refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              }
              // Also decode JWT payload directly to guarantee immediate login
              const base64Url = accessToken.split('.')[1];
              if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);
                if (payload?.email) {
                  const meta = payload.user_metadata || {};
                  const googleUser = {
                    email: payload.email,
                    name:
                      payload.email === 'shalomyosefzeev@gmail.com'
                        ? 'ספי רייכקינד'
                        : meta.full_name || meta.name || payload.email.split('@')[0] || 'משתמש',
                    avatar: meta.avatar_url || meta.picture || null,
                  };
                  if (isMounted) {
                    setCurrentUser(googleUser);
                    localStorage.setItem('ner_neshama_user', JSON.stringify(googleUser));
                  }
                  window.history.replaceState({}, '', window.location.pathname + window.location.search);
                  return;
                }
              }
            }
          } catch (hashErr) {
            console.warn('OAuth hash parse notice:', hashErr);
          }
        }
      }

      try {
        // 1. Check if user is signed in via Supabase (e.g. Google OAuth)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const googleFullName =
            session.user.email === 'shalomyosefzeev@gmail.com'
              ? 'ספי רייכקינד'
              : session.user.user_metadata?.full_name ||
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

  // Today's Hebrew & Gregorian date strings
  const { todayHebrewDate, todayGregorianDate } = useMemo(() => {
    try {
      const now = new Date();
      const hd = new HDate(now);
      const dayNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];
      const dayOfWeek = dayNames[now.getDay()];
      const hebDateOnly = formatHebrewDateString(hd.getDate(), hd.getMonthName(), hd.getFullYear()) || hd.renderGematriya(true);
      const hebStr = `${dayOfWeek}, ${hebDateOnly}`;
      const gregStr = now.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
      return {
        todayHebrewDate: hebStr,
        todayGregorianDate: gregStr,
      };
    } catch {
      return { todayHebrewDate: '', todayGregorianDate: '' };
    }
  }, []);

  const hebrewCalQuickPreview = useMemo(() => {
    try {
      return getHebrewCalendarLivePreview(DEFAULT_HEBREW_CALENDAR_OPTIONS);
    } catch {
      return null;
    }
  }, []);

  // Fetch calendars list for the authenticated user
  const loadUserCalendars = async (silent: boolean = false) => {
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
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  };

  // Fetch full details of a specific calendar
  const loadCalendarDetails = async (calendarId: string, calendarNameHint?: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setLoadingCalendarInfo({
        id: calendarId,
        name: calendarNameHint || currentCalendar?.name || undefined,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('ner_neshama_active_calendar_id', calendarId);
        if (calendarNameHint) {
          localStorage.setItem('ner_neshama_active_calendar_name', calendarNameHint);
        }
        const sp = new URLSearchParams(window.location.search);
        const isShare = sp.get('share') === 'true' || sp.get('isShare') === 'true';
        if (!isShare) {
          sp.set('calendarId', calendarId);
          const qs = sp.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
        }
      }

      const queryParams = new URLSearchParams({
        userEmail: currentUser.email,
        userName: currentUser.name,
        calendarId,
      });

      const res = await fetch(`/api/data?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.calendar) {
        // If calendar no longer exists or user lost access, clear stored active calendar ID
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ner_neshama_active_calendar_id');
          localStorage.removeItem('ner_neshama_active_calendar_name');
          const sp = new URLSearchParams(window.location.search);
          if (sp.get('calendarId') === calendarId && sp.get('share') !== 'true' && sp.get('isShare') !== 'true') {
            sp.delete('calendarId');
            sp.delete('view');
            const qs = sp.toString();
            window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
          }
        }
        return;
      }

      setCurrentCalendar(data.calendar);
      if (typeof window !== 'undefined' && data.calendar.name) {
        localStorage.setItem('ner_neshama_active_calendar_name', data.calendar.name);
      }
      setBranches(data.branches || []);
      setDeceased(data.deceased || []);
      setCalendarMembers(data.members || []);
      setLinkedSources(data.linkedSources || []);
      if (data.membership) {
        setMembership(data.membership);
        const pos = extractUserTreePosition(
          data.membership.selected_branch_ids,
          data.membership.user_generation
        );
        if (typeof data.membership.user_generation === 'number') {
          setUserGeneration(data.membership.user_generation);
          setUserTreePosition(pos);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ner_neshama_user_generation', String(data.membership.user_generation));
            localStorage.setItem('ner_neshama_user_tree_position', JSON.stringify(pos));
          }
        } else if (pos.anchorPersonName || pos.relationType !== 'general') {
          setUserGeneration(pos.userGeneration);
          setUserTreePosition(pos);
        }
      }
    } catch (err) {
      console.error('Error loading calendar details:', err);
    } finally {
      setLoadingCalendarInfo(null);
      setLoading(false);
    }
  };

  // When currentUser changes, reload calendars and restore last active calendar if present
  useEffect(() => {
    if (currentUser) {
      let savedCalId: string | null = null;
      let savedCalName: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const isShare = sp.get('share') === 'true' || sp.get('isShare') === 'true';
        if (!isShare) {
          savedCalId = sp.get('calendarId') || localStorage.getItem('ner_neshama_active_calendar_id');
          savedCalName = localStorage.getItem('ner_neshama_active_calendar_name') || undefined;
        }
      }

      if (savedCalId) {
        // Load the active calendar immediately and fetch the user's calendars list in parallel
        loadCalendarDetails(savedCalId, savedCalName);
        loadUserCalendars(true);
      } else {
        loadUserCalendars(false);
      }
    } else {
      setCalendars([]);
      setCurrentCalendar(null);
      setBranches([]);
      setDeceased([]);
      setMembership(null);
      setCalendarMembers([]);
      setLinkedSources([]);
      setLoadingCalendarInfo(null);
      setLoading(false);
    }
  }, [currentUser]);

  // Handle switching or selecting a calendar
  const handleSelectCalendar = async (cal: CalendarProject) => {
    await loadCalendarDetails(cal.id, cal.name);
  };

  // Handle returning to Calendars Hub
  const handleBackToHub = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ner_neshama_active_calendar_id');
      localStorage.removeItem('ner_neshama_active_calendar_name');
      localStorage.removeItem('ner_neshama_active_view_mode');
      const sp = new URLSearchParams(window.location.search);
      sp.delete('calendarId');
      sp.delete('view');
      const qs = sp.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    setCurrentCalendar(null);
    setBranches([]);
    setDeceased([]);
    setMembership(null);
    setCalendarMembers([]);
    setLinkedSources([]);
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
      handleBackToHub();
    } else {
      await loadUserCalendars();
    }
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
    if (sharedViewData?.calendar) {
      const brParam = sharedViewData.selectedBranchIds.join(',');
      const q = new URLSearchParams({
        isShare: 'true',
        calendarId: sharedViewData.calendar.id,
        branches: brParam,
      });
      if (currentUser?.email) {
        q.set('userEmail', currentUser.email);
        q.set('userName', currentUser.name);
      }
      const r = await fetch(`/api/data?${q.toString()}`);
      const refreshed = await r.json();
      if (refreshed.calendar) setSharedViewData(refreshed);
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
    if (sharedViewData?.calendar) {
      const brParam = sharedViewData.selectedBranchIds.join(',');
      const q = new URLSearchParams({
        isShare: 'true',
        calendarId: sharedViewData.calendar.id,
        branches: brParam,
      });
      if (currentUser?.email) {
        q.set('userEmail', currentUser.email);
        q.set('userName', currentUser.name);
      }
      const r = await fetch(`/api/data?${q.toString()}`);
      const refreshed = await r.json();
      if (refreshed.calendar) setSharedViewData(refreshed);
    }
  };

  const handleManageMember = async (
    memberEmail: string,
    memberName: string,
    role: 'admin' | 'editor' | 'member',
    branchIds: string[]
  ) => {
    if (!currentCalendar || !currentUser) return;
    setCalendarMembers((prev) =>
      prev.map((m) =>
        m.user_email.toLowerCase() === memberEmail.toLowerCase()
          ? { ...m, role, selected_branch_ids: branchIds }
          : m
      )
    );
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manage_member',
        payload: {
          calendar_id: currentCalendar.id,
          member_email: memberEmail,
          member_name: memberName,
          role,
          selected_branch_ids: branchIds,
        },
        userEmail: currentUser.email,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'שגיאה בעדכון הרשאות');
    }
    if (data.members) {
      setCalendarMembers(data.members);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    if (!currentCalendar || !currentUser) return;
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_member',
        payload: {
          calendar_id: currentCalendar.id,
          member_email: memberEmail,
        },
        userEmail: currentUser.email,
      }),
    });
    const data = await res.json();
    if (res.ok && data.members) {
      setCalendarMembers(data.members);
    }
  };

  const handleUnlinkBranchSource = async (sourceCalendarId: string) => {
    if (!currentUser || !currentCalendar) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_member',
        payload: {
          calendar_id: sourceCalendarId,
          member_email: currentUser.email,
        },
        userEmail: currentUser.email,
      }),
    });
    await loadCalendarDetails(currentCalendar.id);
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

  const handleUpdateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCalendar || !currentUser || !editCalendarName.trim()) return;
    const newName = editCalendarName.trim();
    const newDesc = editCalendarDescription.trim();
    setIsSavingCalendarInfo(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_calendar',
          payload: {
            calendarId: currentCalendar.id,
            name: newName,
            description: newDesc,
          },
          userEmail: currentUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'שגיאה בשמירת שם היומן');
        return;
      }
      const updatedCal = data.calendar || {
        ...currentCalendar,
        name: newName,
        description: newDesc,
      };
      setCurrentCalendar(updatedCal);
      setCalendars((prev) =>
        prev.map((c) => (c.id === updatedCal.id ? { ...c, name: updatedCal.name, description: updatedCal.description } : c))
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('ner_neshama_active_calendar_name', updatedCal.name);
      }
      if (data.membership) {
        setMembership(data.membership);
      } else if (membership && Array.isArray(membership.selected_branch_ids)) {
        setMembership({
          ...membership,
          selected_branch_ids: membership.selected_branch_ids.filter((t) => !t.startsWith('calName:')),
        });
      }
      setIsEditingCalendarInfo(false);
      loadUserCalendars(true);
    } catch {
      alert('שגיאה בשמירת שם היומן');
    } finally {
      setIsSavingCalendarInfo(false);
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

  const handleUpdateUserGeneration = async (newGen: number) => {
    setUserGeneration(newGen);
    const updatedPos: UserTreePosition = {
      ...userTreePosition,
      userGeneration: newGen,
    };
    setUserTreePosition(updatedPos);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_neshama_user_generation', String(newGen));
      localStorage.setItem('ner_neshama_user_tree_position', JSON.stringify(updatedPos));
    }
    if (membership && (currentCalendar || sharedViewData?.calendar)) {
      const updatedTokens = applyUserTreePositionToTokens(membership.selected_branch_ids, updatedPos);
      const updated = {
        ...membership,
        user_generation: newGen,
        selected_branch_ids: updatedTokens,
      };
      setMembership(updated);
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_membership',
            payload: { membership: updated },
            userEmail: currentUser?.email,
          }),
        });
      } catch (err) {
        console.error('Failed to save user generation to membership:', err);
      }
    }
  };

  const handleSaveUserTreePosition = async (newPos: UserTreePosition) => {
    setUserTreePosition(newPos);
    setUserGeneration(newPos.userGeneration);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ner_neshama_user_generation', String(newPos.userGeneration));
      localStorage.setItem('ner_neshama_user_tree_position', JSON.stringify(newPos));
    }
    if (membership && (currentCalendar || sharedViewData?.calendar)) {
      const updatedTokens = applyUserTreePositionToTokens(membership.selected_branch_ids, newPos);
      const updated: UserMembership = {
        ...membership,
        user_generation: newPos.userGeneration,
        tree_relation: newPos.relationType,
        tree_person_id: newPos.anchorPersonId,
        tree_person_name: newPos.anchorPersonName,
        selected_branch_ids: updatedTokens,
      };
      setMembership(updated);
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_membership',
            payload: { membership: updated },
            userEmail: currentUser?.email,
          }),
        });
        if (currentCalendar) {
          await loadCalendarDetails(currentCalendar.id);
        }
      } catch (err) {
        console.error('Failed to save tree position to membership:', err);
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('ner_neshama_user');
    localStorage.removeItem('ner_neshama_active_calendar_id');
    localStorage.removeItem('ner_neshama_active_calendar_name');
    localStorage.removeItem('ner_neshama_active_view_mode');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
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
        if (isPersonLiving(d)) return null;
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

  const livingCount = useMemo(() => {
    return deceased.filter((p) => isPersonLiving(p)).length;
  }, [deceased]);

  const deceasedOnlyCount = useMemo(() => {
    return deceased.filter((p) => !isPersonLiving(p)).length;
  }, [deceased]);

  const missingDatesCount = useMemo(() => {
    return deceased.filter((p) => !isPersonLiving(p) && (!p.hebrew_day || !p.hebrew_month)).length;
  }, [deceased]);

  // Check for direct lineage link in URL (?lineage=[id])
  useEffect(() => {
    if (typeof window !== 'undefined' && targetDeceased.length > 0) {
      const sp = new URLSearchParams(window.location.search);
      const lineageId = sp.get('lineage');
      if (lineageId) {
        const found = targetDeceased.find((p) => p.id === lineageId);
        if (found) {
          setLineagePerson(found);
        }
      }
    }
  }, [targetDeceased]);

  const savedCustomCalName = useMemo(() => {
    const token = (membership?.selected_branch_ids || []).find((x) => x.startsWith('calName:'));
    return token ? token.replace('calName:', '').trim() : '';
  }, [membership]);

  const savedMaxGen = useMemo(() => {
    const token = (membership?.selected_branch_ids || []).find((x) => x.startsWith('maxGen:'));
    return token ? token.replace('maxGen:', '').trim() : 'all';
  }, [membership]);

  const savedSkipGens = useMemo(() => {
    return (membership?.selected_branch_ids || [])
      .filter((x) => x.startsWith('skipGen:'))
      .map((x) => x.replace('skipGen:', '').trim())
      .filter(Boolean);
  }, [membership]);

  const savedZShkia = useMemo(
    () => (membership?.selected_branch_ids || []).includes('zShkia:1'),
    [membership]
  );
  const savedZTzeit = useMemo(
    () => (membership?.selected_branch_ids || []).includes('zTzeit:1'),
    [membership]
  );
  const savedZEve = useMemo(
    () => (membership?.selected_branch_ids || []).includes('zEveReminder:1'),
    [membership]
  );

  const webcalFeedUrl = useMemo(() => {
    if (!membership?.feed_token) return '';
    const host = typeof window !== 'undefined' ? window.location.host : 'yomzikaron.vercel.app';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const protocol = isHttps ? 'webcal:' : 'http:';
    const params = new URLSearchParams({ v: '6', type: 'memorials' });
    if (savedCustomCalName) params.set('calName', savedCustomCalName);
    if (savedMaxGen && savedMaxGen !== 'all') params.set('maxGen', savedMaxGen);
    if (savedSkipGens.length > 0) params.set('skipGens', savedSkipGens.join(','));
    if (savedZShkia) params.set('zShkia', '1');
    if (savedZTzeit) params.set('zTzeit', '1');
    if (savedZEve) params.set('zEve', '1');
    return `${protocol}//${host}/api/calendar/${membership.feed_token}.ics?${params.toString()}`;
  }, [membership, savedCustomCalName, savedMaxGen, savedSkipGens, savedZShkia, savedZTzeit, savedZEve]);

  const simchasWebcalUrl = useMemo(() => {
    if (!membership?.feed_token) return '';
    const host = typeof window !== 'undefined' ? window.location.host : 'yomzikaron.vercel.app';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const protocol = isHttps ? 'webcal:' : 'http:';
    const params = new URLSearchParams({ v: '6', type: 'simchas' });
    if (savedMaxGen && savedMaxGen !== 'all') params.set('maxGen', savedMaxGen);
    if (savedSkipGens.length > 0) params.set('skipGens', savedSkipGens.join(','));
    return `${protocol}//${host}/api/calendar/${membership.feed_token}.ics?${params.toString()}`;
  }, [membership, savedMaxGen, savedSkipGens]);

  const googleCalendarSubscribeUrl = useMemo(() => {
    if (!webcalFeedUrl) return '';
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalFeedUrl)}`;
  }, [webcalFeedUrl]);

  const googleSimchasSubscribeUrl = useMemo(() => {
    if (!simchasWebcalUrl) return '';
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(simchasWebcalUrl)}`;
  }, [simchasWebcalUrl]);

  const icsDownloadUrl = useMemo(() => {
    if (!membership?.feed_token) return '';
    const params = new URLSearchParams({ v: '6', type: 'memorials' });
    if (savedCustomCalName) params.set('calName', savedCustomCalName);
    if (savedMaxGen && savedMaxGen !== 'all') params.set('maxGen', savedMaxGen);
    if (savedSkipGens.length > 0) params.set('skipGens', savedSkipGens.join(','));
    if (savedZShkia) params.set('zShkia', '1');
    if (savedZTzeit) params.set('zTzeit', '1');
    if (savedZEve) params.set('zEve', '1');
    return `/api/calendar/${membership.feed_token}.ics?${params.toString()}`;
  }, [membership, savedCustomCalName, savedMaxGen, savedSkipGens, savedZShkia, savedZTzeit, savedZEve]);

  const isAdmin = Boolean(
    currentUser &&
      (membership?.role === 'admin' ||
        currentCalendar?.created_by_user_id === currentUser.email)
  );
  const canEdit = Boolean(
    currentUser &&
      (isAdmin ||
        membership?.role === 'editor' ||
        sharedViewData?.membership?.role === 'admin' ||
        sharedViewData?.membership?.role === 'editor' ||
        sharedViewData?.calendar?.created_by_user_id === currentUser.email)
  );

  // Filtered deceased for shared view based on sharedMaxGen and sharedSkippedGens
  const filteredSharedDeceased = useMemo(() => {
    if (!sharedViewData) return [];
    return sharedViewData.deceased.filter((d) => {
      const relGen = getGenerationRelationInfo(d, userGeneration).relativeGeneration;
      if (sharedMaxGen !== 'all' && relGen > Number(sharedMaxGen)) return false;
      if (sharedSkippedGens.includes(relGen) || (relGen >= 8 && sharedSkippedGens.includes(8))) return false;
      return true;
    });
  }, [sharedViewData, sharedMaxGen, sharedSkippedGens, userGeneration]);

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
          setDefaultModalIsLiving(false);
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
        canEdit={canEdit}
        userGeneration={userGeneration}
        userTreePosition={userTreePosition}
        onUpdateUserGeneration={handleUpdateUserGeneration}
        onOpenTreePosition={() => setIsTreePositionModalOpen(true)}
        onOpenHebrewCalendarSync={() => setIsHebrewCalendarModalOpen(true)}
        todayHebrewDate={todayHebrewDate}
        todayGregorianDate={todayGregorianDate}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ========================================================================= */}
        {/* UNIVERSAL TOP BAR: AUTOMATIC HEBREW CALENDAR, SHABBAT, FASTS & ZMANIM    */}
        {/* Visible to EVERYONE at the top (including unregistered guests!)          */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-l from-purple-950 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:px-6 sm:py-4 text-white shadow-md border border-purple-700/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/30 text-amber-300 border border-purple-400/40">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>פתוח לכולם (ללא צורך בהרשמה) • יומן נפרד בצבע שונה</span>
              </span>
              {hebrewCalQuickPreview?.upcomingShabbat && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-purple-100 border border-white/15 font-serif">
                  <span>🕯️ השבת הקרובה: {hebrewCalQuickPreview.upcomingShabbat.parshaName}</span>
                  <span className="text-amber-300 font-sans text-[10px]">
                    (הדלקת נרות י-ם: {hebrewCalQuickPreview.upcomingShabbat.candleLightingTime} • צאת שבת: {hebrewCalQuickPreview.upcomingShabbat.havdalahTime})
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-black font-serif text-white">
              📅 הוספת יומן אוטומטי של תאריך עברי, שבתות (פרשת השבוע וזמנים), חגים, צומות וזמני היום לבחירה ל-Google Calendar
            </h2>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              מתווסף כיומן נפרד בצבע שונה ביומן גוגל שלך — בחר את העיר שלך ואילו זמני היום (הנץ, סוף זמן ק״ש, תפילה, שקיעה, צאת הכוכבים ועוד), שבתות, צומות וחגים יופיעו בו.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsHebrewCalendarModalOpen(true)}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition transform hover:scale-[1.01] active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span>📅 התאם והוסף יומן תאריך עברי וזמנים ל-Google</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 0: SHARED VIEW MODE (WHEN VISITING VIA SELECTIVE SHARE LINK)        */}
        {/* ========================================================================= */}
        {sharedViewData && (
          <div className="space-y-6">
            {/* Shared View Notice Bar */}
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-bold flex-wrap">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  תצוגת לוח שנה משפחתי משותף: מוצגים ענפי המשפחה שנבחרו ({sharedViewData.branches.map((b) => b.name).join(' • ')})
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    canEdit
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-indigo-700 border-indigo-200'
                  }`}
                >
                  {canEdit ? '✏️ הרשאת עריכה פעילה' : '👁️ צפייה בלבד'}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsTreePositionModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {userTreePosition.anchorPersonName
                      ? `המיקום שלי בעץ: ${formatUserTreePositionLabel(userTreePosition, sharedViewData.calendar.created_by_user_name)}`
                      : 'היכן אני מוגדר בעץ?'}
                  </span>
                </button>
                {!currentUser && (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition cursor-pointer"
                  >
                    התחבר לחשבון (לשמירה / עריכה)
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingDeceased(null);
                      setDefaultModalIsLiving(false);
                      setIsAddModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>הוסף רשומה</span>
                  </button>
                )}
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
            </div>

            {/* Shared Calendar Hero */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden border border-slate-800">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <h2 className="text-2xl sm:text-4xl font-black font-serif text-slate-50">
                    {formatCalendarDisplayName(sharedViewData.calendar.name)}
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                    {formatCalendarDescription(sharedViewData.calendar)} &bull; ענפים משותפים: {sharedViewData.branches.map((b) => b.name).join(', ')}.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center min-w-[95px]">
                    <span className="text-2xl font-black text-white block">{filteredSharedDeceased.length}</span>
                    <span className="text-[11px] text-slate-300 font-bold">רשומות בסינון</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthModalOpen(true);
                        return;
                      }
                      setJoinModalPreselect({
                        calId: sharedViewData.calendar.id,
                        branchIds: sharedViewData.selectedBranchIds,
                        autoApprove: true,
                      });
                      setIsJoinBranchModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 transition rounded-2xl px-4 py-3.5 text-center font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                    title="צרף ואחד ענף זה לתוך היומן המשפחתי האישי שלך כדי שלא תצטרך מספר יומנים נפרדים"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>שלב ענף זה ביומן האישי שלי</span>
                  </button>

                  {(() => {
                    const proto = typeof window !== 'undefined' && window.location.origin.startsWith('https') ? 'webcal:' : 'http:';
                    const host = typeof window !== 'undefined' ? window.location.host : 'yomzikaron.vercel.app';
                    const baseParams = new URLSearchParams({
                      v: '5',
                      branches: sharedViewData.selectedBranchIds.join(','),
                    });
                    if (sharedMaxGen !== 'all') baseParams.set('maxGen', sharedMaxGen);
                    if (sharedSkippedGens.length > 0) baseParams.set('skipGens', sharedSkippedGens.join(','));

                    const memParams = new URLSearchParams(baseParams);
                    memParams.set('type', 'memorials');
                    const simParams = new URLSearchParams(baseParams);
                    simParams.set('type', 'simchas');

                    const memGoogleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                      `${proto}//${host}/api/calendar/${sharedViewData.feedToken}.ics?${memParams.toString()}`
                    )}`;
                    const simGoogleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                      `${proto}//${host}/api/calendar/${sharedViewData.feedToken}.ics?${simParams.toString()}`
                    )}`;

                    return (
                      <>
                        <a
                          href={memGoogleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition rounded-2xl px-4 py-3.5 text-center font-extrabold text-xs shadow-lg shadow-blue-600/30 cursor-pointer"
                        >
                          <CalendarIcon className="w-4 h-4" />
                          <span>🕯️ סנכרן יומן ימי זיכרון</span>
                        </a>
                        <a
                          href={simGoogleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition rounded-2xl px-4 py-3.5 text-center font-extrabold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer"
                        >
                          <Cake className="w-4 h-4" />
                          <span>🎂💍 סנכרן יומן שמחות (בצבע נפרד)</span>
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Interactive Generation Filter & Skipping Box for Shared Calendar Recipients */}
            <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    סינון דורות לסנכרון היומן שלך — בחר כמה דורות להכניס (או וותר על דורות רחוקים כמו 6–7):
                  </span>
                </div>
                <select
                  value={sharedMaxGen}
                  onChange={(e) => setSharedMaxGen(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-blue-50/70 border border-blue-300 rounded-xl px-3 py-1.5 cursor-pointer outline-none"
                >
                  <option value="all">הכל — כל הדורות בעץ</option>
                  <option value="2">עד דור 2 בלבד (הורים, אחים וילדים)</option>
                  <option value="3">עד דור 3 בלבד (כולל סבא וסבתא)</option>
                  <option value="4">עד דור 4 בלבד (כולל סבא-רבא)</option>
                  <option value="5">עד דור 5 בלבד (מוותר על דורות 6–7 ומעלה)</option>
                  <option value="6">עד דור 6 בלבד (מוותר על דור 7 ומעלה)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  או לחץ כדי להסיר/להחזיר דור ספציפי:
                </span>
                {[
                  { gen: 1, label: 'דור 1' },
                  { gen: 2, label: 'דור 2 (הורים)' },
                  { gen: 3, label: 'דור 3 (סבים)' },
                  { gen: 4, label: 'דור 4 (סבא-רבא)' },
                  { gen: 5, label: 'דור 5' },
                  { gen: 6, label: 'דור 6' },
                  { gen: 7, label: 'דור 7' },
                  { gen: 8, label: 'דור 8+' },
                ].map((chip) => {
                  const isExceeded = sharedMaxGen !== 'all' && chip.gen > Number(sharedMaxGen);
                  const isSkipped = sharedSkippedGens.includes(chip.gen) || isExceeded;
                  return (
                    <button
                      key={chip.gen}
                      type="button"
                      disabled={isExceeded}
                      onClick={() =>
                        setSharedSkippedGens((prev) =>
                          prev.includes(chip.gen)
                            ? prev.filter((g) => g !== chip.gen)
                            : [...prev, chip.gen]
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        isSkipped
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {isSkipped ? '✕ ' : '✓ '}
                      {chip.label}
                    </button>
                  );
                })}
                {(sharedMaxGen !== 'all' || sharedSkippedGens.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSharedMaxGen('all');
                      setSharedSkippedGens([]);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline mr-2 cursor-pointer"
                  >
                    אפס סינון דורות
                  </button>
                )}
              </div>
            </div>

            {/* Upcoming Yahrzeits for Shared Branches - Unified Collapsible Div */}
            {upcomingThisMonth.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border border-amber-300/80 rounded-3xl overflow-hidden shadow-sm">
                <div
                  onClick={() => setIsUpcomingOpen((prev) => !prev)}
                  className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 cursor-pointer hover:bg-amber-100/40 transition select-none"
                >
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
                    <BellRing className="w-5 h-5 text-amber-600 animate-bounce shrink-0" />
                    <span className="font-serif font-black text-base sm:text-lg">
                      אזכרות וימי פטירה ב-30 הימים הקרובים ({upcomingThisMonth.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full font-serif">
                      🕯️ מצאת הכוכבים עד השקיעה למחרת
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUpcomingOpen((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-amber-950 border border-amber-300 text-xs font-bold shadow-2xs transition cursor-pointer"
                      title={isUpcomingOpen ? 'סגור רשימת תאריכים קרובים' : 'פתח רשימת תאריכים קרובים'}
                    >
                      <span>{isUpcomingOpen ? 'סגור רשימה' : 'פתח רשימה'}</span>
                      {isUpcomingOpen ? (
                        <ChevronUp className="w-4 h-4 text-amber-700" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-700" />
                      )}
                    </button>
                  </div>
                </div>

                {isUpcomingOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 border-t border-amber-200/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
                      {upcomingThisMonth.map(({ deceased: person, upcoming, diffDays }) => {
                        const genInfo = getGenerationRelationInfo(person, userGeneration);
                        const zm = upcoming.gregorianDateStr ? getHalachicYahrzeitTimes(upcoming.gregorianDateStr) : null;
                        const personBranch = sharedViewData.branches.find((b) => b.id === person.branch_id);
                        return (
                          <div
                            key={person.id}
                            onClick={() => setLineagePerson(person)}
                            className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:border-amber-400 hover:shadow-sm transition h-full"
                            title="לחץ לצפייה בשרשרת הייחוס המלאה (בן אחרי בן / בת)"
                          >
                            <div className="flex flex-col flex-1 justify-between gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-base sm:text-lg font-black text-slate-900 leading-snug font-serif block break-words">
                                    {getDeceasedFullName(person)}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                    {personBranch && (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs"
                                        style={{
                                          backgroundColor: `${personBranch.color}18`,
                                          color: personBranch.color,
                                          borderColor: `${personBranch.color}40`,
                                        }}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: personBranch.color }}
                                        />
                                        <span>ענף: {personBranch.name}</span>
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLineagePerson(person);
                                      }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-2xs font-serif transition cursor-pointer ${
                                        genInfo.isDirect
                                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                                          : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300'
                                      }`}
                                      title={`${genInfo.fullDescription} • לחץ לצפייה בשושלת`}
                                    >
                                      <GitCommit className={`w-3.5 h-3.5 shrink-0 ${genInfo.isDirect ? 'text-amber-700' : 'text-purple-700'}`} />
                                      <span>דור {genInfo.relativeGeneration}{!genInfo.isDirect ? ' (לא ישיר)' : ''}</span>
                                    </button>
                                  </div>
                                  {person.father_or_mother_name && (
                                    <span className="text-[11px] text-slate-600 font-semibold block mt-1.5 font-serif break-words">
                                      לעילוי נשמת: {formatLeiluyNishmat(person)}
                                    </span>
                                  )}
                                </div>

                                <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 shrink-0">
                                  {diffDays === 0 ? 'היום!' : diffDays === 1 ? 'מחר!' : `בעוד ${diffDays} ימים`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 mt-auto border-t border-amber-100/70">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-amber-900 block font-serif">
                                    {['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'][new Date(upcoming.gregorianDate).getDay()]}, {upcoming.hebrewDateStr}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-sans">
                                    ({new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                                      day: 'numeric',
                                      month: 'numeric',
                                      year: 'numeric',
                                    })})
                                  </span>
                                  {zm && (
                                    <span className="text-[11px] font-semibold text-amber-800 mt-0.5 flex items-center gap-1">
                                      <Sunset className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>מתחיל בערב הקודם: שקיעה {zm.startShkiaFormatted} | צאה״כ {zm.startTzeitFormatted}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-500 font-serif">
                                {formatAnniversaryYearText(upcoming.yearsPassed)}
                              </span>
                              <a
                                href={getGoogleCalendarDirectAddUrl(
                                  person,
                                  upcoming,
                                  personBranch?.name,
                                  typeof window !== 'undefined' ? window.location.origin : ''
                                )}
                                onClick={(e) => e.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                              >
                                <CalendarIcon className="w-3 h-3 text-blue-600" />
                                <span>הוסף ליומן</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deceased List (Filtered by chosen generations) */}
            <DeceasedList
              deceased={filteredSharedDeceased}
              branches={sharedViewData.branches}
              isAdmin={canEdit}
              userGeneration={userGeneration}
              onEdit={(person) => {
                setEditingDeceased(person);
                setIsAddModalOpen(true);
              }}
              onDelete={handleDeleteDeceased}
              onOpenLineage={setLineagePerson}
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-bold">
                  <span>🕯️ ממשק ימי זיכרון (יארצייט)</span>
                  <span>•</span>
                  <span>🎂💍 ממשק שמחות וימי הולדת</span>
                  <span>•</span>
                  <span>🌳 עץ משפחה</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-serif text-slate-50">
                  לוח שנה משפחתי &bull; ימי זיכרון, שמחות ועץ הדורות
                </h2>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium max-w-2xl mx-auto">
                  מערכת משפחתית לניהול ימי זיכרון (יארצייט מצאת הכוכבים עד השקיעה), ימי הולדת עבריים וימי נישואין, סינון גמיש לפי דורות, וסנכרון ל-Google Calendar בשני יומנים נפרדים בצבעים שונים.
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
              ״לְדֹר וָדֹר נַגִּיד גָּדְלֶךָ — חיבור חי בין זיכרון הדורות הקודמים לשמחות הדורות הבאים״
            </div>

            {/* 4 Core Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">יארצייט מצאת הכוכבים עד השקיעה</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  חישוב הלכתי מדויק: אירועי היארצייט ביומן מתחילים בדיוק בצאת הכוכבים בערב הקודם ומסתיימים בשקיעת החמה.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Cake className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">ממשק ימי הולדת, נישואין ושמחות</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  תת-ממשק ייעודי לימי הולדת עבריים, ימי נישואין ושמחות משפחתיות המחובר ישירות לעץ המשפחה ולדורות הבאים.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">2 יומנים בצבעים שונים ב-Google</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  אפשרות להוסיף בנפרד את יומן ימי הזיכרון ואת יומן השמחות כך שיופיעו ביומן הגוגל שלכם בשני צבעים נפרדים.
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-black text-lg text-slate-900">סינון דורות גמיש (ויתור על דור)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  כל בן משפחה בוחר כמה דורות להכניס ליומן שלו ויכול לוותר בלחיצה על דורות רחוקים (כמו דור 6–7) או לבחור ענף ספציפי.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LOADING CALENDAR ANIMATION VIEW                                           */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && !currentCalendar && (loadingCalendarInfo || loading) && (
          <div className="max-w-xl mx-auto py-16 px-6 text-center">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                  <Flame className="w-7 h-7 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900">
                  {loadingCalendarInfo?.name
                    ? `טוען את "${formatCalendarDisplayName(loadingCalendarInfo.name)}"...`
                    : 'טוען את היומן המשפחתי...'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  מאחזר ענפי משפחה, תאריכי יארצייט, שמחות ועץ הדורות...
                </p>
              </div>

              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
                <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 via-blue-600 to-indigo-600 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LOGGED IN BUT NO CALENDARS CREATED YET (ONBOARDING)               */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && !loadingCalendarInfo && calendars.length === 0 && !loading && (
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

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsNewCalendarModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-l from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-700/20 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>צור יומן משפחתי ראשון</span>
              </button>

              <button
                onClick={() => {
                  setJoinModalPreselect(null);
                  setIsJoinBranchModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-2xl font-bold text-sm shadow-xs transition cursor-pointer"
              >
                <Link2 className="w-4 h-4 text-indigo-600" />
                <span>בקש להצטרף לענף ביומן קיים</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: LOGGED IN & AT CALENDARS HUB ("כל היומנים שלי")                   */}
        {/* ========================================================================= */}
        {currentUser && !sharedViewData && !currentCalendar && !loadingCalendarInfo && calendars.length > 0 && (
          <div className="space-y-6">
            {/* Hub Banner */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-50">
                  מרכז היומנים המשפחתיים שלי
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  שלום {currentUser.name}, בחר יומן משפחתי לצפייה ולניהול, שתף ענפים ספציפיים או צרף ענף מיומן של קרוב משפחה:
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    setJoinModalPreselect(null);
                    setIsJoinBranchModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 rounded-2xl font-bold text-xs transition shrink-0 cursor-pointer"
                  title="בקש להצטרף לענף מיומן של קרוב משפחה ושלב אותו בתוך היומן שלך"
                >
                  <Link2 className="w-4 h-4" />
                  <span>צרף ענף מיומן משפחתי אחר</span>
                </button>

                <button
                  onClick={() => setIsNewCalendarModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/30 transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>צור יומן חדש</span>
                </button>
              </div>
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
                        {formatCalendarDisplayName(cal.name)}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {formatCalendarDescription(cal, currentUser.name)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold flex-wrap gap-1.5">
                        <span>{cal.deceased_count ?? 0} נפטרים רשומים</span>
                        <span>{cal.branches_count ?? 0} ענפי משפחה</span>
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                          <Users className="w-3.5 h-3.5" />
                          <span>{cal.members_count ?? 1} חברים</span>
                        </span>
                      </div>

                      {(cal.pending_requests_count ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleSelectCalendar(cal);
                            setShareModalInitialTab('members');
                            setIsShareModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                            <span>{cal.pending_requests_count} בקשות הצטרפות ממתינות לאישורך</span>
                          </span>
                          <span className="underline">צפה ואשר &larr;</span>
                        </button>
                      )}

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
                            setShareModalInitialTab('members');
                            setIsShareModalOpen(true);
                          }}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer inline-flex items-center gap-1"
                          title="צפה בחברים שהצטרפו ליומן ובבקשות הצטרפות"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{cal.members_count ?? 1}</span>
                        </button>

                        <button
                          onClick={async () => {
                            await handleSelectCalendar(cal);
                            setShareModalInitialTab('share');
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
                className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 px-3.5 rounded-xl border border-slate-200/90 shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה לכל היומנים שלי</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Add Living Family Member / Hebrew Birthday Button */}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingDeceased(null);
                      setDefaultModalIsLiving(true);
                      setIsAddModalOpen(true);
                    }}
                    className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                    title="הוסף יום הולדת עברי או יום נישואין לבן/בת משפחה בחיים והמשך לבנות את העץ הלאה"
                  >
                    <Cake className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>הוסף יום הולדת / שמחה</span>
                  </button>
                )}

                {/* Join / Merge Branch from Another Calendar Button */}
                <button
                  onClick={() => {
                    setJoinModalPreselect(null);
                    setIsJoinBranchModalOpen(true);
                  }}
                  className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                  title="בקש להצטרף לענף מיומן של קרוב משפחה רחוק ושלב אותו בתוך היומן הנוכחי שלך"
                >
                  <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>צרף ענף מיומן אחר</span>
                </button>

                {/* Members & Join Requests Button (1-Click Access) */}
                <button
                  onClick={() => {
                    setShareModalInitialTab('members');
                    setIsShareModalOpen(true);
                  }}
                  className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                  title="צפה בכל החברים שהצטרפו ליומן שלך ובבקשות הצטרפות הממתינות לאישור"
                >
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>חברים ובקשות ({calendarMembers.length})</span>
                  {calendarMembers.some((m) => (m.selected_branch_ids || []).includes('status:pending')) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                      {
                        calendarMembers.filter((m) =>
                          (m.selected_branch_ids || []).includes('status:pending')
                        ).length
                      }{' '}
                      ממתינות
                    </span>
                  )}
                </button>

                {/* Smart GEM Import Button (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={() => setIsGemImportModalOpen(true)}
                    className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3.5 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                    title="ייבוא חכם של נפטרים וענפים מ-GEM או מ-JSON"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ייבוא חכם (GEM)</span>
                  </button>
                )}

                {/* Share Calendar Button */}
                <button
                  onClick={() => {
                    setShareModalInitialTab('share');
                    setIsShareModalOpen(true);
                  }}
                  className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>שתף יומן (לפי ענפים)</span>
                </button>

                {/* Delete Calendar Button (Admin Only) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCalendarToDelete(currentCalendar);
                      setIsDeleteModalOpen(true);
                    }}
                    className="h-9 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 rounded-xl transition cursor-pointer whitespace-nowrap"
                    title="מחק יומן זה לצמיתות"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">מחק יומן</span>
                  </button>
                )}
              </div>
            </div>

            {/* Admin Notification Banner: Pending Branch Join Requests */}
            {isAdmin &&
              calendarMembers.some((m) => (m.selected_branch_ids || []).includes('status:pending')) && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
                      <BellRing className="w-5 h-5 text-amber-600 animate-bounce shrink-0" />
                      <span>
                        בקשות הצטרפות לענפים ביומן שלך הממתינות לאישור (
                        {
                          calendarMembers.filter((m) =>
                            (m.selected_branch_ids || []).includes('status:pending')
                          ).length
                        }
                        )
                      </span>
                    </div>
                    <span className="text-xs text-amber-800 font-semibold">
                      לאחר אישורך, הענף יתווסף ויתעדכן אוטומטית ביומן של המבקש
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {calendarMembers
                      .filter((m) => (m.selected_branch_ids || []).includes('status:pending'))
                      .map((m) => {
                        const tags = m.selected_branch_ids || [];
                        const noteTag = tags.find((t) => t.startsWith('reqNote:'));
                        const noteText = noteTag ? noteTag.replace('reqNote:', '') : '';
                        const reqRoleTag = tags.find((t) => t.startsWith('reqRole:'));
                        const reqRole =
                          reqRoleTag?.replace('reqRole:', '') === 'editor' ? 'editor' : 'member';
                        const subBranchTag = tags.find(
                          (t) =>
                            t.startsWith('gen2:') || t.startsWith('gen3:') || t.startsWith('gen4:')
                        );
                        const subBranchName = subBranchTag ? subBranchTag.split(':').pop() : null;
                        const requestedBranchNames = branches
                          .filter((b) => tags.includes(b.id))
                          .map((b) => b.name);

                        return (
                          <div
                            key={m.id || m.user_email}
                            className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {m.user_name} ({m.user_email})
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  ביקש: {reqRole === 'editor' ? 'הרשאת עריכה' : 'צפייה בלבד'}
                                </span>
                              </div>
                              <p className="text-indigo-800 font-bold">
                                ענף מבוקש:{' '}
                                {requestedBranchNames.length > 0
                                  ? requestedBranchNames.join(' • ')
                                  : 'כל הענפים'}
                                {subBranchName ? ` (תת-ענף: ${subBranchName})` : ''}
                              </p>
                              {noteText && (
                                <p className="text-slate-600 italic bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                  ״{noteText}״
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() =>
                                  handleManageMember(
                                    m.user_email,
                                    m.user_name,
                                    'member',
                                    tags.filter((t) => t !== 'status:pending')
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                              >
                                ✓ אשר (צפייה)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleManageMember(
                                    m.user_email,
                                    m.user_name,
                                    'editor',
                                    tags.filter((t) => t !== 'status:pending')
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                              >
                                ✏️ אשר (עם עריכה)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.user_email)}
                                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition cursor-pointer"
                              >
                                דחה בקשה
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Linked Branches from Other Family Calendars Summary Bar */}
            {linkedSources.length > 0 && (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-indigo-600" />
                    <span>ענפים משולבים מיומנים משפחתיים אחרים:</span>
                  </span>
                  {linkedSources.map((ls) => (
                    <span
                      key={ls.membership_id || ls.source_calendar_id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold border ${
                        ls.status === 'approved'
                          ? 'bg-white text-indigo-900 border-indigo-200'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}
                    >
                      <span>
                        {formatCalendarDisplayName(ls.source_calendar_name)} (בעל היומן: {ls.source_owner_name})
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          ls.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-200/80 text-amber-950'
                        }`}
                      >
                        {ls.status === 'approved' ? 'מאוחד ומסונכרן ✓' : 'ממתין לאישור ⏳'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnlinkBranchSource(ls.source_calendar_id)}
                        className="text-slate-400 hover:text-red-600 mr-1 cursor-pointer"
                        title="נתק ענף זה מהיומן שלך"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dignified Calendar Hero Section - Uniform Height & Symmetrical Alignment */}
            <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 rounded-3xl px-6 py-5 sm:px-8 sm:py-6 text-white shadow-xl relative overflow-hidden border border-slate-800/80">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5">
                <div className="flex flex-col justify-center min-h-[78px] max-w-2xl w-full">
                  {!isEditingCalendarInfo ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight font-serif text-slate-50">
                          {formatCalendarDisplayName(currentCalendar.name)}
                        </h2>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditCalendarName(formatCalendarDisplayName(currentCalendar.name));
                              setEditCalendarDescription(
                                currentCalendar.description ||
                                  `לוח שנה משפחתי מתעדכן אוטומטית | בעל היומן: ${
                                    currentCalendar.created_by_user_name || currentUser.name
                                  }`
                              );
                              setIsEditingCalendarInfo(true);
                            }}
                            className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold border border-white/15 transition cursor-pointer whitespace-nowrap"
                            title="הגדר או שנה את שם היומן ותיאורו"
                          >
                            <Pencil className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>הגדר שם יומן</span>
                          </button>
                        )}
                      </div>

                      <p className="text-slate-300 text-xs sm:text-sm leading-snug font-medium">
                        {formatCalendarDescription(currentCalendar, currentUser.name)}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateCalendar} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-amber-300 mb-1">
                          שם היומן (כפי שיופיע באתר וב-Google Calendar):
                        </label>
                        <input
                          type="text"
                          required
                          value={editCalendarName}
                          onChange={(e) => setEditCalendarName(e.target.value)}
                          placeholder="למשל: יומן משפחת רייכקינד"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          תיאור היומן (שם בעל היומן ישולב בתיאור היומן):
                        </label>
                        <input
                          type="text"
                          value={editCalendarDescription}
                          onChange={(e) => setEditCalendarDescription(e.target.value)}
                          placeholder={`בעל היומן: ${currentCalendar.created_by_user_name || currentUser.name}`}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingCalendarInfo(false)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition cursor-pointer"
                        >
                          ביטול
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingCalendarInfo}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer disabled:opacity-50"
                        >
                          {isSavingCalendarInfo ? 'שומר...' : 'שמור שם ותיאור יומן'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Quick Metrics & Actions - Strictly Identical Height (h-[78px]) & Single-Line Labels */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-stretch gap-2.5 w-full xl:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="h-[78px] min-w-[108px] px-3.5 bg-white/5 hover:bg-white/10 transition backdrop-blur-md rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center cursor-pointer"
                    title="צפה ברשימת ימי הזיכרון (יארצייט)"
                  >
                    <span className="text-2xl font-black text-white leading-none">{deceasedOnlyCount}</span>
                    <span className="text-[11px] text-slate-300 font-bold mt-1.5 whitespace-nowrap">🕯️ נפטרים ביומן</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('birthdays')}
                    className="h-[78px] min-w-[116px] px-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 transition backdrop-blur-md rounded-2xl border border-emerald-400/30 flex flex-col items-center justify-center text-center cursor-pointer"
                    title="לחץ לצפייה והוספת ימי הולדת עבריים, ימי נישואין ושמחות משפחתיות"
                  >
                    <span className="text-2xl font-black text-emerald-300 leading-none">{livingCount}</span>
                    <span className="text-[11px] text-emerald-100 font-bold mt-1.5 whitespace-nowrap">🎂 שמחות ולידות</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('tree')}
                    className="h-[78px] min-w-[104px] px-3.5 bg-white/5 hover:bg-white/10 transition backdrop-blur-md rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center cursor-pointer"
                    title="צפה בעץ המשפחה והענפים"
                  >
                    <span className="text-2xl font-black text-amber-400 leading-none">{branches.length}</span>
                    <span className="text-[11px] text-slate-300 font-bold mt-1.5 whitespace-nowrap">🌳 ענפי משפחה</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShareModalInitialTab('members');
                      setIsShareModalOpen(true);
                    }}
                    className="h-[78px] min-w-[112px] px-3.5 bg-indigo-500/15 hover:bg-indigo-500/25 transition backdrop-blur-md rounded-2xl border border-indigo-400/30 flex flex-col items-center justify-center text-center cursor-pointer relative"
                    title="לחץ לצפייה בחברים שהצטרפו ליומן ובבקשות הצטרפות"
                  >
                    <span className="text-2xl font-black text-indigo-200 leading-none">{calendarMembers.length}</span>
                    <span className="text-[11px] text-indigo-100 font-bold mt-1.5 whitespace-nowrap">👥 חברים ובקשות</span>
                  </button>

                  {missingDatesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewMode('missing')}
                      className="h-[78px] min-w-[104px] px-3.5 bg-amber-500/20 hover:bg-amber-500/30 transition backdrop-blur-md rounded-2xl border border-amber-400/40 flex flex-col items-center justify-center text-center cursor-pointer"
                      title="לחץ לצפייה בדמויות ברובריקת ללא תאריך"
                    >
                      <span className="text-2xl font-black text-amber-300 leading-none">{missingDatesCount}</span>
                      <span className="text-[11px] text-amber-200 font-bold mt-1.5 whitespace-nowrap">⚠️ ללא תאריך</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShareModalInitialTab('share');
                      setIsShareModalOpen(true);
                    }}
                    className="h-[78px] min-w-[108px] px-4 col-span-2 sm:col-span-1 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 transition rounded-2xl text-center font-extrabold shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-5 h-5 text-white shrink-0" />
                    <span className="text-[11px] text-white font-extrabold mt-1.5 whitespace-nowrap">שתף יומן זה</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 30-Day Upcoming Yahrzeits Highlight Ribbon - Unified Collapsible Div */}
            {upcomingThisMonth.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border border-amber-300/80 rounded-3xl overflow-hidden shadow-sm">
                <div
                  onClick={() => setIsUpcomingOpen((prev) => !prev)}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6 cursor-pointer hover:bg-amber-100/40 transition select-none"
                >
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm sm:text-base">
                    <BellRing className="w-5 h-5 text-amber-600 animate-bounce shrink-0" />
                    <span className="font-serif font-black text-base sm:text-lg">
                      אזכרות וימי פטירה ב-30 הימים הקרובים ({upcomingThisMonth.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-full font-serif">
                      🕯️ מצאת הכוכבים עד השקיעה למחרת
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUpcomingOpen((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-amber-950 border border-amber-300 text-xs font-bold shadow-2xs transition cursor-pointer"
                      title={isUpcomingOpen ? 'סגור רשימת תאריכים קרובים' : 'פתח רשימת תאריכים קרובים'}
                    >
                      <span>{isUpcomingOpen ? 'סגור רשימה' : 'פתח רשימה'}</span>
                      {isUpcomingOpen ? (
                        <ChevronUp className="w-4 h-4 text-amber-700" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-700" />
                      )}
                    </button>
                  </div>
                </div>

                {isUpcomingOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-amber-200/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
                      {upcomingThisMonth.map(({ deceased: person, upcoming, diffDays }) => {
                        const genInfo = getGenerationRelationInfo(person, userGeneration);
                        const zm = upcoming.gregorianDateStr ? getHalachicYahrzeitTimes(upcoming.gregorianDateStr) : null;
                        const personBranch = branches.find((b) => b.id === person.branch_id);
                        return (
                          <div
                            key={person.id}
                            onClick={() => setLineagePerson(person)}
                            className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-2.5 hover:shadow-md transition cursor-pointer hover:border-amber-400 h-full min-h-[192px]"
                            title="לחץ לצפייה בשרשרת הייחוס המלאה (בן אחרי בן / בת)"
                          >
                            {/* Top Section: Full Name, Branch Badge, Generation Badge & Full Leiluy Nishmat */}
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-base sm:text-lg font-black text-slate-900 leading-snug font-serif break-words">
                                  {getDeceasedFullName(person)}
                                </span>
                                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-xl bg-amber-100 text-amber-900 shrink-0 whitespace-nowrap">
                                  {diffDays === 0 ? 'היום!' : diffDays === 1 ? 'מחר!' : `בעוד ${diffDays} ימים`}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {personBranch && (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs"
                                    style={{
                                      backgroundColor: `${personBranch.color}18`,
                                      color: personBranch.color,
                                      borderColor: `${personBranch.color}40`,
                                    }}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: personBranch.color }}
                                    />
                                    <span>ענף: {personBranch.name}</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLineagePerson(person);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs font-serif transition cursor-pointer whitespace-nowrap ${
                                    genInfo.isDirect
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                                      : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300'
                                  }`}
                                  title={`${genInfo.fullDescription} • לחץ לצפייה בשושלת`}
                                >
                                  <GitCommit className={`w-3 h-3 shrink-0 ${genInfo.isDirect ? 'text-amber-700' : 'text-purple-700'}`} />
                                  <span>דור {genInfo.relativeGeneration}{!genInfo.isDirect ? ' (לא ישיר)' : ''}</span>
                                </button>
                              </div>

                              {person.father_or_mother_name && (
                                <span className="block text-[11px] text-slate-600 font-semibold font-serif break-words pt-0.5">
                                  לעילוי נשמת: {formatLeiluyNishmat(person)}
                                </span>
                              )}
                            </div>

                            {/* Middle Section: Uniform Date & Halachic Time Box */}
                            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl px-3 py-2 mt-auto">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-bold text-amber-950 font-serif truncate">
                                  {['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'][new Date(upcoming.gregorianDate).getDay()]}, {upcoming.hebrewDateStr}
                                </span>
                                <span className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
                                  {new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              {zm && (
                                <div className="text-[11px] font-semibold text-amber-800 mt-1 flex items-center gap-1 whitespace-nowrap">
                                  <Sunset className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>מתחיל בערב הקודם: שקיעה {zm.startShkiaFormatted} | צאה״כ {zm.startTzeitFormatted}</span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Footer Section */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-500 font-serif">
                                {formatAnniversaryYearText(upcoming.yearsPassed)}
                              </span>
                              <a
                                href={getGoogleCalendarDirectAddUrl(
                                  person,
                                  upcoming,
                                  personBranch?.name,
                                  typeof window !== 'undefined' ? window.location.origin : '',
                                  { includeStartShkia: savedZShkia, includeStartTzeit: savedZTzeit }
                                )}
                                onClick={(e) => e.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition whitespace-nowrap"
                              >
                                <CalendarIcon className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>הוסף ליומן</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Mode Navigation Tabs & 2-Calendar Sync Bar (No Horizontal Scrollbar) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              {/* Sub-Interface Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl flex-wrap">
                <button
                  onClick={() => setViewMode('list')}
                  className={`h-9 flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>🕯️ ימי זיכרון (יארצייט)</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-700 font-extrabold">
                    {deceasedOnlyCount}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('birthdays')}
                  className={`h-9 flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                    viewMode === 'birthdays'
                      ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Cake className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>🎂💍 שמחות וימי הולדת</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-extrabold">
                    {livingCount}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('tree')}
                  className={`h-9 flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                    viewMode === 'tree'
                      ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5 shrink-0" />
                  <span>🌳 עץ המשפחה</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-extrabold">
                    {deceased.length}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('missing')}
                  className={`h-9 flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                    viewMode === 'missing'
                      ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>ללא תאריך</span>
                  {missingDatesCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950">
                      {missingDatesCount}
                    </span>
                  )}
                </button>
              </div>

              {/* 1-Click Sync Bar: 2 Separate Calendars (Memorials vs Simchas in Separate Color) + Generation Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {googleCalendarSubscribeUrl && (
                  <a
                    href={googleCalendarSubscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3 bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer whitespace-nowrap"
                    title="יומן 1: סנכרן את יומן ימי הזיכרון (יארצייט מצאת הכוכבים עד השקיעה) ל-Google Calendar"
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>🕯️ סנכרן ימי זיכרון</span>
                  </a>
                )}

                {googleSimchasSubscribeUrl && (
                  <a
                    href={googleSimchasSubscribeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer whitespace-nowrap"
                    title="יומן 2: סנכרן את יומן ימי ההולדת, ימי הנישואין והשמחות כיומן שני (בצבע נפרד!) ל-Google Calendar"
                  >
                    <Cake className="w-3.5 h-3.5 shrink-0" />
                    <span>🎂 סנכרן שמחות (בצבע נפרד)</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap"
                  title="בחר כמה דורות להכניס ליומן והאם להוסיף שעת שקיעה / צאת הכוכבים ליארצייט"
                >
                  <GitCommit className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>סינון דורות וזמנים</span>
                </button>

                {icsDownloadUrl && (
                  <a
                    href={icsDownloadUrl}
                    download="yahrzeits.ics"
                    className="h-9 w-9 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer shrink-0"
                    title="הורד קובץ יומן (ICS)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* View Mode Switching: List / Birthdays / Tree / Missing Rubric */}
            {viewMode === 'list' && (
              <DeceasedList
                deceased={deceased}
                branches={branches}
                isAdmin={canEdit}
                userGeneration={userGeneration}
                onEdit={(person) => {
                  setEditingDeceased(person);
                  setDefaultModalIsLiving(false);
                  setIsAddModalOpen(true);
                }}
                onDelete={handleDeleteDeceased}
                onOpenLineage={setLineagePerson}
              />
            )}

            {viewMode === 'birthdays' && (
              <HebrewBirthdaysView
                deceased={deceased}
                branches={branches}
                isAdmin={canEdit}
                userGeneration={userGeneration}
                simchasWebcalUrl={simchasWebcalUrl}
                onAddLiving={(simchaType) => {
                  setEditingDeceased(null);
                  setDefaultModalIsLiving(true);
                  setDefaultModalSimchaType(simchaType || 'birthday');
                  setIsAddModalOpen(true);
                }}
                onEdit={(person) => {
                  setEditingDeceased(person);
                  setDefaultModalIsLiving(true);
                  setIsAddModalOpen(true);
                }}
                onDelete={handleDeleteDeceased}
                onOpenLineage={setLineagePerson}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
            )}

            {viewMode === 'tree' && (
              <FamilyTreeView
                deceased={deceased}
                branches={branches}
                userGeneration={userGeneration}
                userTreePosition={userTreePosition}
                calendarOwnerName={currentCalendar.created_by_user_name}
                canEdit={canEdit}
                onEditDeceased={(person) => {
                  setEditingDeceased(person);
                  setDefaultModalIsLiving(isPersonLiving(person));
                  setIsAddModalOpen(true);
                }}
                onAddDeceased={(initial) => {
                  setEditingDeceased(initial as any);
                  setDefaultModalIsLiving(false);
                  setIsAddModalOpen(true);
                }}
                onOpenLineage={setLineagePerson}
                onOpenTreePosition={() => setIsTreePositionModalOpen(true)}
              />
            )}

            {viewMode === 'missing' && (
              <MissingDatesView
                deceased={deceased}
                branches={branches}
                userGeneration={userGeneration}
                canEdit={canEdit}
                onEditDeceased={(person) => {
                  setEditingDeceased(person);
                  setDefaultModalIsLiving(isPersonLiving(person));
                  setIsAddModalOpen(true);
                }}
                onOpenLineage={setLineagePerson}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-500 mt-12 space-y-1">
        <p className="font-semibold text-slate-700 font-serif">
          לוח שנה משפחתי &bull; ממשק ימי זיכרון (יארצייט מצאת הכוכבים עד השקיעה), ממשק שמחות (ימי הולדת ונישואין) ועץ המשפחה
        </p>
        <p className="text-[11px] text-slate-400">
          כל הזכויות שמורות &bull; תמיכה מלאה בסנכרון 2 יומנים בצבעים שונים ל-Google Calendar, Apple Calendar ו-Outlook
        </p>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <HebrewCalendarSyncModal
        isOpen={isHebrewCalendarModalOpen}
        onClose={() => setIsHebrewCalendarModalOpen(false)}
      />

      {(currentCalendar || sharedViewData?.calendar) && (
        <DeceasedModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDeceased(null);
            setDefaultModalIsLiving(false);
          }}
          onSave={handleSaveDeceased}
          branches={currentCalendar ? branches : (sharedViewData?.branches || [])}
          initialData={editingDeceased}
          calendarId={(currentCalendar || sharedViewData?.calendar)!.id}
          defaultIsLiving={defaultModalIsLiving}
          defaultSimchaType={defaultModalSimchaType}
          allPeople={currentCalendar ? deceased : (sharedViewData?.deceased || [])}
        />
      )}

      {currentCalendar && (
        <>
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
            deceased={deceased}
            membership={membership}
            calendarName={currentCalendar.name}
            calendarOwnerName={currentCalendar.created_by_user_name || currentUser?.name}
            onUpdateBranches={handleUpdateMembershipBranches}
            onOpenHebrewCalendarModal={() => setIsHebrewCalendarModalOpen(true)}
          />

          <ShareCalendarModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            calendar={currentCalendar}
            branches={branches}
            deceased={deceased}
            feedToken={membership?.feed_token}
            isAdmin={isAdmin}
            members={calendarMembers}
            initialTab={shareModalInitialTab}
            onManageMember={handleManageMember}
            onRemoveMember={handleRemoveMember}
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

      <JoinBranchModal
        isOpen={isJoinBranchModalOpen}
        onClose={() => {
          setIsJoinBranchModalOpen(false);
          setJoinModalPreselect(null);
        }}
        currentUser={currentUser}
        userCalendars={calendars}
        activeCalendarId={currentCalendar?.id}
        preselectedSourceCalendarId={joinModalPreselect?.calId}
        preselectedBranchIds={joinModalPreselect?.branchIds}
        autoApproveIfAlreadyMember={Boolean(joinModalPreselect?.autoApprove)}
        onSuccess={async () => {
          if (currentCalendar) {
            await loadCalendarDetails(currentCalendar.id);
          } else {
            await loadUserCalendars();
          }
        }}
      />

      <LineageModal
        isOpen={Boolean(lineagePerson)}
        onClose={() => {
          setLineagePerson(null);
          if (typeof window !== 'undefined' && window.location.search.includes('lineage=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('lineage');
            window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
        person={lineagePerson}
        currentUser={currentUser}
        userGeneration={userGeneration}
        userTreePosition={userTreePosition}
        onOpenTreePosition={() => setIsTreePositionModalOpen(true)}
      />

      {(currentCalendar || sharedViewData?.calendar) && (
        <TreePositionModal
          isOpen={isTreePositionModalOpen}
          onClose={() => setIsTreePositionModalOpen(false)}
          deceased={currentCalendar ? deceased : (sharedViewData?.deceased || [])}
          branches={currentCalendar ? branches : (sharedViewData?.branches || [])}
          calendarOwnerName={
            (currentCalendar || sharedViewData?.calendar)?.created_by_user_name || 'בעל היומן'
          }
          currentPosition={userTreePosition}
          canEdit={canEdit}
          onSavePosition={handleSaveUserTreePosition}
          onOpenAddSelfToTree={() => {
            setEditingDeceased(null);
            setDefaultModalIsLiving(true);
            setDefaultModalSimchaType('birthday');
            setIsAddModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
