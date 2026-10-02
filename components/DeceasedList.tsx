'use client';

import React, { useState, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  formatDisplayDateWithGregorian,
  calculateUpcomingYahrzeits,
  formatAnniversaryYearText,
  getGoogleCalendarDirectAddUrl,
  getDeceasedFormattedParts,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
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
  GitCommit,
} from 'lucide-react';

// Helper to identify Holocaust victims (both direct ancestors and siblings/collateral relatives)
export function isHolocaustVictim(person: DeceasedPerson): boolean {
  const text = `${person.notes || ''} ${person.relationship || ''} ${person.title || ''} ${person.first_name || ''} ${person.last_name || ''}`.toLowerCase();
  return (
    text.includes('קדושי השואה') ||
    text.includes('שואה') ||
    text.includes('אושוויץ') ||
    text.includes('ברגן') ||
    text.includes('טרבלינקה') ||
    text.includes('תאי הגזים') ||
    text.includes('גטו לודז') ||
    text.includes('auschwitz') ||
    text.includes('bergen') ||
    text.includes('treblinka') ||
    text.includes('shoah') ||
    text.includes('holocaust')
  );
}

interface DeceasedListProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  isAdmin: boolean;
  userGeneration?: number;
  onEdit: (deceased: DeceasedPerson) => void;
  onDelete: (id: string) => void;
  onOpenLineage?: (person: DeceasedPerson) => void;
}

export const DeceasedList: React.FC<DeceasedListProps> = ({
  deceased,
  branches,
  isAdmin,
  userGeneration = 1,
  onEdit,
  onDelete,
  onOpenLineage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'holocaust' | 'ancestors' | 'direct' | 'non_direct'>('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedGenerationFilter, setSelectedGenerationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'upcoming' | 'name' | 'branch'>('upcoming');

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  // Holocaust & Ancestor counts
  const holocaustCount = useMemo(() => deceased.filter(isHolocaustVictim).length, [deceased]);
  const ancestorsCount = useMemo(
    () => deceased.filter((d) => (d.generation || 0) >= 4 || (d.relationship && d.relationship.includes('קדמון'))).length,
    [deceased]
  );
  const directCount = useMemo(
    () => deceased.filter((d) => getGenerationRelationInfo(d, userGeneration).isDirect).length,
    [deceased, userGeneration]
  );
  const nonDirectCount = useMemo(
    () => deceased.filter((d) => !getGenerationRelationInfo(d, userGeneration).isDirect).length,
    [deceased, userGeneration]
  );

  // Compute available generations sorted
  const availableGenerations = useMemo(() => {
    const gens = new Set<number>();
    for (const d of deceased) {
      if (typeof d.generation === 'number') {
        gens.add(d.generation);
      }
    }
    return Array.from(gens).sort((a, b) => a - b);
  }, [deceased]);

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
      const matchesCategory =
        selectedCategoryFilter === 'all'
          ? true
          : selectedCategoryFilter === 'holocaust'
          ? isHolocaustVictim(person)
          : selectedCategoryFilter === 'ancestors'
          ? (person.generation || 0) >= 4 || (person.relationship && person.relationship.includes('קדמון'))
          : selectedCategoryFilter === 'direct'
          ? getGenerationRelationInfo(person).isDirect
          : selectedCategoryFilter === 'non_direct'
          ? !getGenerationRelationInfo(person).isDirect
          : true;

      const matchesBranch =
        selectedBranchFilter === 'all' ||
        person.branch_id === selectedBranchFilter ||
        (person.notes &&
          branchMap.get(selectedBranchFilter)?.name &&
          person.notes.includes(branchMap.get(selectedBranchFilter)!.name));

      const matchesGeneration =
        selectedGenerationFilter === 'all'
          ? true
          : selectedGenerationFilter === 'unknown'
          ? !person.generation
          : person.generation === Number(selectedGenerationFilter);

      const fullSearch = `${person.first_name} ${person.last_name} ${person.father_or_mother_name || ''} ${
        person.notes || ''
      }`.toLowerCase();
      const matchesQuery = fullSearch.includes(searchQuery.toLowerCase());

      return matchesCategory && matchesBranch && matchesGeneration && matchesQuery;
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
  }, [
    deceasedWithUpcoming,
    selectedCategoryFilter,
    selectedBranchFilter,
    selectedGenerationFilter,
    searchQuery,
    sortBy,
    branchMap,
  ]);


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

        {/* Category Filter Pills: All / Holocaust / Ancestors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar border-b border-slate-100/80">
          <span className="text-xs font-bold text-slate-500 shrink-0 ml-1">קטגוריה:</span>
          
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition shrink-0 cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            כל הנפטרים ({deceased.length})
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'holocaust' ? 'all' : 'holocaust')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-xl transition shrink-0 border cursor-pointer ${
              selectedCategoryFilter === 'holocaust'
                ? 'bg-amber-500 border-amber-600 text-white shadow-md'
                : 'bg-amber-50/90 border-amber-200 text-amber-900 hover:bg-amber-100 shadow-2xs'
            }`}
            title="הצג את כל קדושי השואה: כולל אבות קדמונים, אחים ואחיות (אחיות סבתא מלכה ועוד)"
          >
            <Flame className={`w-3.5 h-3.5 ${selectedCategoryFilter === 'holocaust' ? 'text-white' : 'text-amber-600 animate-pulse'}`} />
            <span>שואה &bull; קדושי השואה</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategoryFilter === 'holocaust' ? 'bg-amber-600 text-white' : 'bg-amber-200/80 text-amber-900'
            }`}>
              {holocaustCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'ancestors' ? 'all' : 'ancestors')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 border cursor-pointer ${
              selectedCategoryFilter === 'ancestors'
                ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                : 'bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:bg-indigo-100 shadow-2xs'
            }`}
            title="הצג אבות ואמהות קדמונים (דור 4 ומעלה)"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>אבות קדמונים</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategoryFilter === 'ancestors' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {ancestorsCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'direct' ? 'all' : 'direct')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 border cursor-pointer ${
              selectedCategoryFilter === 'direct'
                ? 'bg-amber-600 border-amber-700 text-white shadow-md'
                : 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100 shadow-2xs'
            }`}
            title="הצג רק קשר ישיר של אב/אם קדמוני"
          >
            <GitCommit className="w-3.5 h-3.5 text-amber-600" />
            <span>קשר ישיר (אב/אם)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategoryFilter === 'direct' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
              {directCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'non_direct' ? 'all' : 'non_direct')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 border cursor-pointer ${
              selectedCategoryFilter === 'non_direct'
                ? 'bg-purple-600 border-purple-700 text-white shadow-md'
                : 'bg-purple-50/80 border-purple-200 text-purple-900 hover:bg-purple-100 shadow-2xs'
            }`}
            title="הצג נפטרים שאינם קשר ישיר של אב/אם (דודים, אחיות סבתא, ענפים צדדיים)"
          >
            <GitCommit className="w-3.5 h-3.5 text-purple-600" />
            <span>לא קשר ישיר (דודים/קרובים)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategoryFilter === 'non_direct' ? 'bg-purple-700 text-white' : 'bg-purple-200 text-purple-900'
            }`}>
              {nonDirectCount}
            </span>
          </button>
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
            {selectedCategoryFilter === 'holocaust'
              ? `כל הענפים (${holocaustCount})`
              : `כל הענפים (${deceased.length})`}
          </button>
          {branches.map((b) => {
            const count =
              selectedCategoryFilter === 'holocaust'
                ? deceased.filter((d) => d.branch_id === b.id && isHolocaustVictim(d)).length
                : deceased.filter((d) => d.branch_id === b.id).length;
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

        {/* Generation Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2.5 border-t border-slate-100 no-scrollbar">

          <GitCommit className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-500 shrink-0">סינון לפי דור:</span>

          <select
            value={selectedGenerationFilter}
            onChange={(e) => setSelectedGenerationFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer outline-none transition shrink-0"
          >
            <option value="all">כל הדורות ({deceased.length})</option>
            {availableGenerations.map((g) => {
              const count = deceased.filter((d) => d.generation === g).length;
              return (
                <option key={g} value={String(g)}>
                  דור {g} ({count} נפטרים)
                </option>
              );
            })}
          </select>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedGenerationFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                selectedGenerationFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              הכל
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => {
              const count = deceased.filter((d) => d.generation === g).length;
              if (count === 0) return null;
              const isSelected = selectedGenerationFilter === String(g);
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGenerationFilter(isSelected ? 'all' : String(g))}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  דור {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Holocaust Category Banner */}
      {selectedCategoryFilter === 'holocaust' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/40 to-amber-50 border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-700 shrink-0 shadow-inner">
              <Flame className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-amber-950 font-serif">
                קדושי השואה הי״ד ({filteredAndSorted.length} נפטרים)
              </h4>
              <p className="text-xs text-amber-900/80 leading-relaxed font-serif">
                מוצגים כל קדושי השואה: אבות ואמהות קדמונים, וכן אחים ואחיות (אחיות סבתא מלכה ע״ה, אחות סבא יהושע צבי ע״ה ודודים).
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-white hover:bg-amber-100 border border-amber-300 px-3.5 py-2 rounded-xl transition shrink-0 cursor-pointer self-start sm:self-auto shadow-2xs font-serif"
          >
            חזרה לכל הנפטרים
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
            <Flame className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">לא נמצאו רשומות נפטרים</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {selectedCategoryFilter === 'holocaust'
              ? 'לא נמצאו קדושי שואה בענף זה או בחיפוש המבוקש. נסה לבחור ״כל הענפים״.'
              : searchQuery || selectedBranchFilter !== 'all'
              ? 'נסה לבטל את מילות החיפוש או לבחור ענף משפחתי אחר.'
              : 'היומן עדיין ריק. לחץ על כפתור ״הוסף נפטר״ למעלה כדי להתחיל לתעד את אבות המשפחה.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSorted.map(({ person, upcoming, daysUntil }) => {
            const branch = branchMap.get(person.branch_id);
            const { cleanTitle, showTitle, cleanFirstName, cleanLastName, honorific, fullName } = getDeceasedFormattedParts(person);
            const dateDisplay = formatDisplayDateWithGregorian(
              person.hebrew_day,
              person.hebrew_month,
              person.hebrew_year,
              person.gregorian_original_date
            );

            const isVictim = isHolocaustVictim(person);
            const isComingSoon = daysUntil <= 30 && daysUntil >= 0;
            const genInfo = getGenerationRelationInfo(person, userGeneration);

            return (
              <div
                key={person.id}
                onClick={() => onOpenLineage?.(person)}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md relative group cursor-pointer hover:border-amber-400/90 ${
                  isVictim
                    ? 'border-amber-300/90 ring-1 ring-amber-300/30 bg-gradient-to-b from-amber-50/20 to-white'
                    : isComingSoon
                    ? 'border-amber-300/80 ring-1 ring-amber-300/30'
                    : 'border-slate-200/90'
                }`}
                title="לחץ לצפייה בשרשרת הייחוס המלאה (בן אחרי בן / בת)"
              >
                {/* Branch Color Top Accent Strip */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: branch?.color || '#2563eb' }}
                />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Header: Branch Badge, Generation Badge & Admin Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                      {/* Generation & Relationship Badge - Click to view lineage */}
                      <button
                        onClick={() => onOpenLineage?.(person)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs hover:shadow-xs transition cursor-pointer font-serif ${
                          genInfo.isDirect
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300/80'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'
                        }`}
                        title={genInfo.fullDescription}
                      >
                        <GitCommit className={`w-3.5 h-3.5 ${genInfo.isDirect ? 'text-amber-600' : 'text-purple-600'}`} />
                        <span>דור {genInfo.relativeGeneration}{!genInfo.isDirect ? ' (לא ישיר)' : ''}</span>
                      </button>

                      {/* Holocaust Victim Badge */}
                      {isVictim && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs"
                          title="קדוש השואה הי״ד - עלה על המוקד על קידוש השם"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                          <span>קדוש השואה הי״ד</span>
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(person);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="ערוך פרטי נפטר"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `האם אתה בטוח שברצונך למחוק את הרשומה של ${fullName}?`
                              )
                            ) {
                              onDelete(person.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="מחק רשומה מהיומן"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Deceased Names Header */}
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-serif leading-snug">
                      {showTitle && (
                        <span className="text-xl font-bold text-amber-800/90 ml-1.5 inline">
                          {cleanTitle}
                        </span>
                      )}
                      <span className="inline">{cleanFirstName}</span>
                      {cleanLastName && (
                        <span className="text-blue-950 mr-1.5 inline">
                          {' '}{cleanLastName}
                        </span>
                      )}
                      {honorific && (
                        <span className="text-sm font-extrabold text-slate-400 mr-2 inline-block align-middle">
                          {honorific}
                        </span>
                      )}
                    </h3>
                    {person.father_or_mother_name && (
                      <p className="text-xs text-slate-600 font-semibold mt-1.5 flex items-baseline gap-1 font-serif flex-wrap">
                        <span className="shrink-0 text-slate-500">לעילוי נשמת:</span>
                        <span className="text-slate-800 font-bold">{formatLeiluyNishmat(person)}</span>
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
                        <div>
                          <p className="font-bold text-slate-900 font-serif text-sm">
                            {['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'][new Date(upcoming.gregorianDate).getDay()]}, {upcoming.hebrewDateStr}
                          </p>
                          <p className="text-[11px] text-slate-500 font-sans">
                            ({new Date(upcoming.gregorianDate).toLocaleDateString('he-IL', {
                              day: 'numeric',
                              month: 'numeric',
                              year: 'numeric',
                            })})
                          </p>
                        </div>
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
                          href={getGoogleCalendarDirectAddUrl(person, upcoming, branch?.name, typeof window !== 'undefined' ? window.location.origin : '')}
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
