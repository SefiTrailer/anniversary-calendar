'use client';

import React, { useState, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  formatDisplayDateWithGregorian,
  calculateUpcomingYahrzeits,
  formatAnniversaryYearText,
  getGoogleCalendarDirectAddUrl,
} from '@/lib/hebrew-calendar';
import {
  Search,
  Flame,
  Edit3,
  Trash2,
  Sunset,
  Calendar as CalendarIcon,
  Filter,
  MapPin,
  Clock,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<'upcoming' | 'name' | 'branch'>('upcoming');

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  // Compute upcoming Yahrzeits once per person
  const deceasedWithUpcoming = useMemo(() => {
    return deceased.map((person) => {
      let upcoming = null;
      if (person.hebrew_day && person.hebrew_month) {
        try {
          const list = calculateUpcomingYahrzeits(person, 1);
          upcoming = list && list.length > 0 ? list[0] : null;
        } catch {
          upcoming = null;
        }
      }
      let daysUntil = Infinity;
      if (upcoming) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yahrzeitDate = new Date(upcoming.gregorianDate);
        yahrzeitDate.setHours(0, 0, 0, 0);
        const diffTime = yahrzeitDate.getTime() - today.getTime();
        daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return { person, upcoming, daysUntil };
    });
  }, [deceased]);

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    let result = deceasedWithUpcoming.filter(({ person }) => {
      const matchesBranch =
        selectedBranchFilter === 'all' || person.branch_id === selectedBranchFilter;

      const fullSearch = `${person.first_name} ${person.last_name} ${person.father_or_mother_name || ''} ${
        person.notes || ''
      }`.toLowerCase();
      const matchesQuery = fullSearch.includes(searchQuery.toLowerCase());

      return matchesBranch && matchesQuery;
    });

    result.sort((a, b) => {
      if (sortBy === 'upcoming') {
        return a.daysUntil - b.daysUntil;
      }
      if (sortBy === 'name') {
        return a.person.last_name.localeCompare(b.person.last_name, 'he');
      }
      if (sortBy === 'branch') {
        const branchA = branchMap.get(a.person.branch_id)?.name || '';
        const branchB = branchMap.get(b.person.branch_id)?.name || '';
        return branchA.localeCompare(branchB, 'he');
      }
      return 0;
    });

    return result;
  }, [deceasedWithUpcoming, selectedBranchFilter, searchQuery, sortBy, branchMap]);

  return (
    <div className="space-y-6">
      {/* Search, Filter & Sort Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="חיפוש נפטר לפי שם פרטי, משפחה או הערה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-sm rounded-2xl border border-slate-300/90 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50/50 transition font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-full hover:bg-slate-200"
              >
                נקה
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500">מיון:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer outline-none transition"
            >
              <option value="upcoming">היארצייט הקרוב ביותר</option>
              <option value="name">לפי שם משפחה</option>
              <option value="branch">לפי ענף משפחתי</option>
            </select>
          </div>
        </div>

        {/* Branch Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedBranchFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition shrink-0 cursor-pointer ${
              selectedBranchFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
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
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: b.color || '#2563eb' }}
                />
                <span>{b.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-semibold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
            <Flame className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">לא נמצאו רשומות נפטרים</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery || selectedBranchFilter !== 'all'
              ? 'נסה לבטל את מילות החיפוש או לבחור ענף משפחתי אחר.'
              : 'היומן עדיין ריק. לחץ על כפתור ״הוסף נפטר״ למעלה כדי להתחיל לתעד את אבות המשפחה.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSorted.map(({ person, upcoming, daysUntil }) => {
            const branch = branchMap.get(person.branch_id);
            const dateDisplay = formatDisplayDateWithGregorian(
              person.hebrew_day,
              person.hebrew_month,
              person.hebrew_year,
              person.gregorian_original_date
            );

            const isComingSoon = daysUntil <= 30 && daysUntil >= 0;

            return (
              <div
                key={person.id}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md relative group ${
                  isComingSoon ? 'border-amber-300/80 ring-1 ring-amber-300/30' : 'border-slate-200/90'
                }`}
              >
                {/* Branch Color Top Accent Strip */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: branch?.color || '#2563eb' }}
                />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Header: Branch Badge & Admin Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs"
                      style={{
                        backgroundColor: `${branch?.color || '#2563eb'}12`,
                        color: branch?.color || '#2563eb',
                        borderColor: `${branch?.color || '#2563eb'}30`,
                        borderWidth: '1px',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: branch?.color || '#2563eb' }}
                      />
                      {branch?.name || 'ענף משפחתי'}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onEdit(person)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="ערוך פרטי נפטר"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `האם אתה בטוח שברצונך למחוק את הרשומה של ${person.first_name} ${person.last_name} ז״ל?`
                              )
                            ) {
                              onDelete(person.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="מחק רשומה מהיומן"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Deceased Names Header */}
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                        {person.first_name}
                      </h3>
                      <span className="text-2xl font-black text-blue-950 tracking-tight font-serif">
                        {person.last_name}
                      </span>
                      <span className="text-sm font-extrabold text-slate-400 font-serif">ז״ל</span>
                    </div>
                    {person.father_or_mother_name && (
                      <p className="text-xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1 font-serif">
                        <span>לעילוי נשמת:</span>
                        <span className="text-slate-800 font-bold">{person.father_or_mother_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Hebrew Date Primary, Gregorian Original in Parentheses */}
                  <div className="bg-gradient-to-r from-amber-50/70 via-amber-50/40 to-slate-50 p-3.5 rounded-2xl border border-amber-200/70 space-y-1 shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-900 block font-serif">
                      תאריך פטירה מקורי:
                    </span>
                    <p className="text-base font-black text-slate-900 tracking-wide font-serif">
                      {dateDisplay}
                    </p>
                    {person.after_sunset && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 mt-1">
                        <Sunset className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>נפטר/ה לאחר צאת הכוכבים / השקיעה</span>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Yahrzeit Card Banner */}
                  {upcoming && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition ${
                        isComingSoon
                          ? 'bg-gradient-to-br from-amber-100/70 to-amber-50 border-amber-300 text-amber-950 shadow-xs'
                          : 'bg-slate-50/90 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-extrabold">
                        <span className="flex items-center gap-1.5 font-serif text-sm">
                          <Flame
                            className={`w-4 h-4 ${isComingSoon ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`}
                          />
                          <span>היארצייט הקרוב:</span>
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-black font-serif ${
                            isComingSoon
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {formatAnniversaryYearText(upcoming.yearsPassed)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <p className="font-bold text-slate-900 font-serif text-sm">
                          {upcoming.hebrewDateStr} &bull;{' '}
                          <span className="font-medium text-xs font-sans">
                            {new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        </p>
                        {daysUntil >= 0 && (
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {daysUntil === 0
                              ? 'היום!'
                              : daysUntil === 1
                              ? 'מחר!'
                              : `בעוד ${daysUntil} ימים`}
                          </span>
                        )}
                      </div>

                      {/* Instant 1-Click Google Calendar Push Button */}
                      <div className="pt-1 flex items-center justify-end">
                        <a
                          href={getGoogleCalendarDirectAddUrl(person, upcoming, branch?.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200/90 px-3 py-1.5 rounded-xl transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                          title="פתח ושמור אירוע זה ישירות ביומן גוגל שלך ללא המתנה"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span>הוסף מיד ל-Google Calendar</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Notes / Burial Place / Customs */}
                  {person.notes && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{person.notes}</span>
                    </div>
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
