'use client';

import React, { useState, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  formatDisplayDateWithGregorian,
  calculateUpcomingYahrzeits,
  formatBirthdayYearText,
  getGoogleCalendarDirectAddUrl,
  getDeceasedFormattedParts,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
  isPersonLiving,
  cleanLivingMarkerFromText,
} from '@/lib/hebrew-calendar';
import {
  Cake,
  Search,
  Plus,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  GitCommit,
  Sparkles,
  Clock,
  Filter,
  ArrowUpDown,
  Users,
} from 'lucide-react';

interface HebrewBirthdaysViewProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  isAdmin: boolean;
  userGeneration?: number;
  onAddLiving: () => void;
  onEdit: (person: DeceasedPerson) => void;
  onDelete: (id: string) => void;
  onOpenLineage?: (person: DeceasedPerson) => void;
}

export const HebrewBirthdaysView: React.FC<HebrewBirthdaysViewProps> = ({
  deceased,
  branches,
  isAdmin,
  userGeneration = 1,
  onAddLiving,
  onEdit,
  onDelete,
  onOpenLineage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedGenGroup, setSelectedGenGroup] = useState<'all' | 'descendants' | 'peers' | 'parents' | 'grandparents'>('all');
  const [sortBy, setSortBy] = useState<'upcoming' | 'name' | 'generation'>('upcoming');

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const livingPeople = useMemo(
    () => deceased.filter((d) => isPersonLiving(d)),
    [deceased]
  );

  const livingWithUpcoming = useMemo(() => {
    return livingPeople.map((person) => {
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
        const bdayDate = new Date(upcoming.gregorianDate);
        bdayDate.setHours(0, 0, 0, 0);
        daysUntil = Math.round((bdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        person,
        upcoming,
        daysUntil,
        branch: branchMap.get(person.branch_id),
      };
    });
  }, [livingPeople, branchMap]);

  const upcoming30Days = useMemo(
    () =>
      livingWithUpcoming
        .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [livingWithUpcoming]
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return livingWithUpcoming
      .filter(({ person }) => {
        if (selectedBranchFilter !== 'all' && person.branch_id !== selectedBranchFilter) {
          return false;
        }
        const gen = typeof person.generation === 'number' ? person.generation : 1;
        if (selectedGenGroup === 'descendants' && gen > 0) return false;
        if (selectedGenGroup === 'peers' && gen !== 1) return false;
        if (selectedGenGroup === 'parents' && gen !== 2) return false;
        if (selectedGenGroup === 'grandparents' && gen < 3) return false;

        if (!q) return true;
        const full = `${person.first_name} ${person.last_name} ${person.father_or_mother_name || ''} ${cleanLivingMarkerFromText(person.relationship)} ${cleanLivingMarkerFromText(person.notes)}`.toLowerCase();
        return full.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'upcoming') {
          return a.daysUntil - b.daysUntil;
        }
        if (sortBy === 'generation') {
          return (a.person.generation ?? 1) - (b.person.generation ?? 1);
        }
        const nameA = `${a.person.last_name} ${a.person.first_name}`;
        const nameB = `${b.person.last_name} ${b.person.first_name}`;
        return nameA.localeCompare(nameB, 'he');
      });
  }, [livingWithUpcoming, searchQuery, selectedBranchFilter, selectedGenGroup, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-emerald-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-emerald-700/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <Cake className="w-3.5 h-3.5" />
              <span>ימי הולדת עבריים והמשך בניית עץ המשפחה</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              🎂 ימי הולדת עבריים של בני המשפחה החיים ({livingPeople.length})
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              כאן ניתן להוסיף ולנהל את ימי ההולדת העבריים של בני המשפחה החיים (הורים, אחים, ילדים, נכדים ונינים).
              כל דמות שתוסיפו משתלבת אוטומטית בעץ המשפחה המלא ומאפשרת לבנות את העץ הלאה לדורות הבאים.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onAddLiving}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>הוסף יום הולדת עברי לבן/בת משפחה</span>
            </button>
          )}
        </div>

        {/* Upcoming Birthdays in Next 30 Days */}
        {upcoming30Days.length > 0 && (
          <div className="mt-5 pt-4 border-t border-emerald-700/60">
            <div className="text-xs font-bold text-emerald-200 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ימי הולדת עבריים ב-30 הימים הקרובים ({upcoming30Days.length}):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {upcoming30Days.map(({ person, upcoming, daysUntil, branch }) => {
                const parts = getDeceasedFormattedParts(person);
                return (
                  <div
                    key={person.id}
                    className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">
                        🎂 {parts.fullName}
                      </div>
                      <div className="text-xs text-emerald-200 truncate">
                        {upcoming?.hebrewDateStr} •{' '}
                        {upcoming && upcoming.yearsPassed > 0
                          ? `יום הולדת ${upcoming.yearsPassed}`
                          : 'יום הולדת עברי'}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        daysUntil === 0
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40'
                      }`}
                    >
                      {daysUntil === 0
                        ? 'היום! 🎉'
                        : daysUntil === 1
                        ? 'מחר!'
                        : `בעוד ${daysUntil} ימים`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש בן/בת משפחה לפי שם, שם הורה או קרבה..."
              className="w-full pr-10 pl-4 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">כל הענפים המשפחתיים</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="upcoming">מיון: יום ההולדת הקרוב ביותר</option>
              <option value="name">מיון: לפי שם משפחה ושם פרטי</option>
              <option value="generation">מיון: לפי דור בעץ המשפחה</option>
            </select>
          </div>
        </div>

        {/* Generation Group Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'all', label: 'כל הדורות' },
            { id: 'descendants', label: 'ילדים, נכדים ונינים (דור ההמשך)' },
            { id: 'peers', label: 'הדור שלי / אחים / בני דודים' },
            { id: 'parents', label: 'הורים ודודים (דור 2)' },
            { id: 'grandparents', label: 'סבים וסבתות (דור 3+)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedGenGroup(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedGenGroup === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-emerald-300 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <Cake className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {livingPeople.length === 0
                ? 'עדיין לא נוספו ימי הולדת עבריים של בני המשפחה החיים'
                : 'לא נמצאו בני משפחה התואמים לסינון שנבחר'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              הוספת בני המשפחה החיים עם תאריך הלידה העברי שלהם מאפשרת לקבל תזכורות לימי הולדת עבריים ביומן,
              ולבנות את עץ המשפחה הלאה (ובמקרה של פטירה ח״ו — להעביר את הרשומה למצב יארצייט בלחיצה אחת בלי לאבד את חיבורי העץ).
            </p>
          </div>
          {isAdmin && livingPeople.length === 0 && (
            <button
              type="button"
              onClick={onAddLiving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף בן/בת משפחה ראשון ללוח ימי ההולדת</span>
            </button>
          )}
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSorted.map(({ person, upcoming, daysUntil, branch }) => {
            const parts = getDeceasedFormattedParts(person);
            const genInfo = getGenerationRelationInfo(person, userGeneration);
            const parentLine = formatLeiluyNishmat(person);
            const cleanRel = cleanLivingMarkerFromText(person.relationship);
            const cleanNotes = cleanLivingMarkerFromText(person.notes);
            const hasLineage = Array.isArray(person.lineage_path) && person.lineage_path.length > 0;

            const birthDateDisplay = formatDisplayDateWithGregorian(
              person.hebrew_day,
              person.hebrew_month,
              person.hebrew_year,
              person.gregorian_original_date
            );

            return (
              <div
                key={person.id}
                className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-3.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Cake className="w-3.5 h-3.5 text-emerald-600" />
                      <span>בחיים • יום הולדת עברי</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {genInfo.badgeText}
                      </span>
                      {branch && (
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: branch.color || '#059669' }}
                        >
                          {branch.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Person Name & Relationship */}
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {parts.fullName}
                    </h3>
                    {cleanRel && (
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        קרבה: {cleanRel}
                      </p>
                    )}
                    {parentLine && (
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ייחוס להורים: {parentLine}</span>
                      </p>
                    )}
                  </div>

                  {/* Birth Date Box */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">תאריך לידה עברי:</span>
                      <span className="font-bold text-slate-900">{birthDateDisplay}</span>
                    </div>

                    {upcoming && (
                      <>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                          <span className="text-slate-600 font-medium">יום ההולדת הקרוב:</span>
                          <span className="font-bold text-emerald-900">
                            {upcoming.hebrewDateStr} (
                            {upcoming.gregorianDate.toLocaleDateString('he-IL')})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">גיל ביום ההולדת הקרוב:</span>
                          <span className="font-extrabold text-emerald-700">
                            {upcoming.yearsPassed > 0
                              ? formatBirthdayYearText(upcoming.yearsPassed)
                              : 'שנת הלידה'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {cleanNotes && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80">
                      {cleanNotes}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {upcoming && (
                      <a
                        href={getGoogleCalendarDirectAddUrl(
                          person,
                          upcoming,
                          branch?.name,
                          typeof window !== 'undefined' ? window.location.origin : ''
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>הוסף ליומן Google</span>
                      </a>
                    )}

                    {hasLineage && onOpenLineage && (
                      <button
                        type="button"
                        onClick={() => onOpenLineage(person)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <GitCommit className="w-3.5 h-3.5 text-emerald-600" />
                        <span>יוחסין</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {upcoming && daysUntil <= 30 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3 h-3 inline ml-1" />
                        {daysUntil === 0 ? 'היום!' : `בעוד ${daysUntil} ימים`}
                      </span>
                    )}

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(person)}
                          title="עריכת פרטים / מעבר למצב פטירה ח״ו"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(person.id)}
                          title="מחיקה"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
