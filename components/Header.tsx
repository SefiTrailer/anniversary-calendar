'use client';

import React from 'react';
import { CalendarProject, UserMembership } from '@/lib/types';
import { Calendar, Flame, Plus, Share2, Layers, ShieldCheck, UserCheck } from 'lucide-react';

interface HeaderProps {
  calendars: CalendarProject[];
  currentCalendar: CalendarProject | null;
  onSelectCalendar: (cal: CalendarProject) => void;
  onOpenNewCalendar: () => void;
  onOpenBranches: () => void;
  onOpenAddDeceased: () => void;
  onOpenSync: () => void;
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
  membership,
  isAdmin,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  נר נשמה
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  יומן ימי פטירה
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                ניהול וסנכרון ימי פטירה (יארצייט) לפי לוח השנה העברי
              </p>
            </div>
          </div>

          {/* Calendar Selector & Project Hub */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 mr-2 ml-1" />
              <select
                className="bg-transparent text-sm font-medium text-slate-800 focus:outline-none cursor-pointer py-1 pr-1 pl-2"
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
                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition-colors"
                title="פרויקט יומן חדש"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Admin / Role Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-blue-700 font-semibold">מנהל יומן</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-600">חבר משפחה</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <button
                onClick={onOpenBranches}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>ענפי משפחה</span>
              </button>
            )}

            <button
              onClick={onOpenSync}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-sm"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>סנכרון ליומן גוגל</span>
            </button>

            <button
              onClick={onOpenAddDeceased}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף נפטר</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
