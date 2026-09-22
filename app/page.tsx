'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { DeceasedList } from '@/components/DeceasedList';
import { DeceasedModal } from '@/components/DeceasedModal';
import { BranchManagerModal } from '@/components/BranchManagerModal';
import { GoogleSyncModal } from '@/components/GoogleSyncModal';
import { NewCalendarModal } from '@/components/NewCalendarModal';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from '@/lib/types';
import { calculateUpcomingYahrzeits } from '@/lib/hebrew-calendar';
import { Flame, Calendar as CalendarIcon, Users, BellRing, Sparkles, Share2 } from 'lucide-react';

export default function HomePage() {
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
  const [editingDeceased, setEditingDeceased] = useState<DeceasedPerson | null>(null);

  const [loading, setLoading] = useState(true);

  // Load data from API
  const loadData = async (calendarId?: string) => {
    try {
      const url = calendarId ? `/api/data?calendarId=${calendarId}` : '/api/data';
      const res = await fetch(url);
      const data = await res.json();

      if (data.calendars && data.calendars.length > 0) {
        setCalendars(data.calendars);
        const selected = calendarId
          ? data.calendars.find((c: CalendarProject) => c.id === calendarId)
          : data.calendars[0];

        setCurrentCalendar(selected);

        // Fetch details for selected
        if (calendarId && data.branches) {
          setBranches(data.branches);
          setDeceased(data.deceased || []);
        } else {
          // get for the first one
          const subRes = await fetch(`/api/data?calendarId=${selected.id}`);
          const subData = await subRes.json();
          setBranches(subData.branches || []);
          setDeceased(subData.deceased || []);
        }

        // Set default membership
        const member = data.memberships?.find((m: UserMembership) => m.calendar_id === selected?.id) || {
          id: 'mem-user',
          calendar_id: selected.id,
          user_email: 'sefi@example.com',
          user_name: 'ספי ישראלי',
          role: 'admin',
          feed_token: 'feed-all-branches-demo',
          selected_branch_ids: (data.branches || []).map((b: FamilyBranch) => b.id),
        };
        setMembership(member);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      body: JSON.stringify({ action, payload }),
    });

    const data = await res.json();
    if (res.status === 409 && data.conflict) {
      return data;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save');
    }

    // Refresh calendar data
    if (currentCalendar) {
      await loadData(currentCalendar.id);
    }
  };

  const handleDeleteDeceased = async (id: string) => {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_deceased', payload: { id } }),
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
      }),
    });
    await loadData(currentCalendar.id);
  };

  const handleDeleteBranch = async (id: string) => {
    if (!currentCalendar) return;
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_branch', payload: { id } }),
    });
    await loadData(currentCalendar.id);
  };

  const handleCreateCalendar = async (name: string, description: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_calendar',
        payload: {
          name,
          description,
          user_name: 'ספי ישראלי',
          user_email: 'sefi@example.com',
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
      }),
    });
  };

  // Find upcoming yahrzeits in the next 30 days
  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);

  const upcomingThisMonth = deceased
    .map((d) => {
      const up = calculateUpcomingYahrzeits(d, 1)[0];
      return { deceased: d, upcoming: up };
    })
    .filter((item) => {
      if (!item.upcoming) return false;
      const d = new Date(item.upcoming.gregorianDate);
      return d >= now && d <= next30Days;
    })
    .sort((a, b) => new Date(a.upcoming.gregorianDate).getTime() - new Date(b.upcoming.gregorianDate).getTime());

  const isAdmin = membership?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header Bar */}
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
        membership={membership}
        isAdmin={isAdmin}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome / Stats Banner */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-sm border border-white/10">
                <Flame className="w-3.5 h-3.5" />
                <span>זכרון להולכים &bull; שיוך לענפי המשפחה</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {currentCalendar?.name || 'טוען יומן משפחתי...'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {currentCalendar?.description ||
                  'ניהול ימי פטירה (יארצייט) לפי לוח השנה העברי, התחשבות בשקיעה ושנים מעוברות, וסנכרון אישי ליומן גוגל.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[100px]">
                <span className="text-2xl font-black text-white block">{deceased.length}</span>
                <span className="text-[11px] text-slate-300 font-medium">נפטרים רשומים</span>
              </div>
              <div className="flex-1 sm:flex-initial bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[100px]">
                <span className="text-2xl font-black text-amber-400 block">{branches.length}</span>
                <span className="text-[11px] text-slate-300 font-medium">ענפי משפחה</span>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="hidden sm:flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-500 transition rounded-2xl p-4 text-center min-w-[120px] shadow-lg shadow-blue-600/30 font-semibold text-xs"
              >
                <Share2 className="w-5 h-5 mb-1" />
                <span>סנכרן ליומן שלי</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming This Month Alert if any */}
        {upcomingThisMonth.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-3">
              <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>ימי פטירה (יארצייט) ב-30 הימים הקרובים:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingThisMonth.map(({ deceased: person, upcoming }) => (
                <div
                  key={person.id}
                  className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-slate-900">
                      {person.first_name} {person.last_name} ז״ל
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {upcoming.hebrewDateStr} &bull;{' '}
                      {new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">
                    שנת ה-{upcoming.yearsPassed}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deceased List Grid */}
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
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>מערכת ״נר נשמה״ לניהול ימי פטירה משפחתיים &bull; מחושב הלכתית לפי שקיעת החמה ולוח השנה העברי</p>
      </footer>

      {/* Modals */}
      <DeceasedModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDeceased(null);
        }}
        onSave={handleSaveDeceased}
        branches={branches}
        initialData={editingDeceased}
        calendarId={currentCalendar?.id || 'cal-default'}
      />

      <BranchManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        branches={branches}
        deceased={deceased}
        calendarId={currentCalendar?.id || 'cal-default'}
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
        currentUserName="ספי ישראלי"
      />
    </div>
  );
}
