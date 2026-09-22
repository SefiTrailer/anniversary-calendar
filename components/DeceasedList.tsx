'use client';

import React, { useState } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  formatDisplayDateWithGregorian,
  calculateUpcomingYahrzeits,
  HEBREW_MONTHS_TRANSLATION,
} from '@/lib/hebrew-calendar';
import { Search, Flame, Edit2, Trash2, Sunset, Calendar, Filter, MapPin } from 'lucide-react';

interface DeceasedListProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  isAdmin: boolean;
  onEdit: (person: DeceasedPerson) => void;
  onDelete: (id: string) => void;
}

export const DeceasedList: React.FC<DeceasedListProps> = ({
  deceased,
  branches,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  // Filter deceased
  const filtered = deceased.filter((d) => {
    const matchesBranch =
      selectedBranchFilter === 'all' || d.branch_id === selectedBranchFilter;

    const fullSearch = `${d.first_name} ${d.last_name} ${d.father_or_mother_name || ''} ${
      d.notes || ''
    }`.toLowerCase();
    const matchesQuery = fullSearch.includes(searchQuery.toLowerCase());

    return matchesBranch && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="חיפוש לפי שם פרטי, משפחה או הערה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedBranchFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
              selectedBranchFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            כל הענפים ({deceased.length})
          </button>
          {branches.map((b) => {
            const count = deceased.filter((d) => d.branch_id === b.id).length;
            const isSelected = selectedBranchFilter === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBranchFilter(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 border ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: b.color || '#2563eb' }}
                />
                <span>{b.name}</span>
                <span className="text-[10px] text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Flame className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">לא נמצאו רשומות נפטרים</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedBranchFilter !== 'all'
              ? 'נסה לשנות את מילות החיפוש או הסינון.'
              : 'היומן ריק כרגע. לחץ על כפתור ״הוסף נפטר״ כדי להתחיל לתעד את אבות המשפחה.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((person) => {
            const branch = branchMap.get(person.branch_id);
            const dateDisplay = formatDisplayDateWithGregorian(
              person.hebrew_day,
              person.hebrew_month,
              person.hebrew_year,
              person.gregorian_original_date
            );

            // Calculate next upcoming Yahrzeit
            const upcoming = calculateUpcomingYahrzeits(person, 1)[0];

            return (
              <div
                key={person.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Branch Color Top Accent */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: branch?.color || '#2563eb' }}
                />

                <div className="p-5 space-y-4">
                  {/* Top Bar: Branch Badge & Action buttons */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${branch?.color || '#2563eb'}15`,
                        color: branch?.color || '#2563eb',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: branch?.color || '#2563eb' }}
                      />
                      {branch?.name || 'ענף משפחתי'}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onEdit(person)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="ערוך פרטי נפטר"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `האם למחוק את הרשומה של ${person.first_name} ${person.last_name} ז"ל?`
                              )
                            ) {
                              onDelete(person.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          title="מחק רשומה"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Names */}
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        {person.first_name}
                      </h3>
                      <span className="text-lg font-extrabold text-blue-900">
                        {person.last_name}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">ז״ל</span>
                    </div>
                    {person.father_or_mother_name && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {person.father_or_mother_name}
                      </p>
                    )}
                  </div>

                  {/* Original Death Date: Hebrew Primary, Gregorian in Parentheses */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      תאריך פטירה מקורי:
                    </span>
                    <p className="text-sm font-bold text-slate-800">
                      {dateDisplay}
                    </p>
                    {person.after_sunset && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 mt-1">
                        <Sunset className="w-3 h-3 text-amber-600" />
                        פטירה לאחר השקיעה / בצאת הכוכבים
                      </span>
                    )}
                  </div>

                  {/* Upcoming Yahrzeit Badge */}
                  {upcoming && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-amber-950 font-bold">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          היארצייט הקרוב:
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 font-semibold">
                          שנת ה-{upcoming.yearsPassed} לפטירה
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        {upcoming.hebrewDateStr} &bull;{' '}
                        <span className="font-semibold text-slate-900">
                          {new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Notes / Burial Place */}
                  {person.notes && (
                    <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{person.notes}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
