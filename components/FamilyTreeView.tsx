'use client';

import React, { useState, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  formatDisplayDateWithGregorian,
  getDeceasedFormattedParts,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
  extractBranchHierarchy,
  matchesBranchHierarchyFilter,
  isPersonLiving,
  cleanLivingMarkerFromText,
  UserTreePosition,
  formatUserTreePositionLabel,
} from '@/lib/hebrew-calendar';
import { isHolocaustVictim } from '@/components/DeceasedList';
import { Users, Calendar, AlertCircle, Edit2, Search, Filter, Sparkles, Heart, GitCommit, Flame, GitBranch, Layers, Cake, MapPin } from 'lucide-react';

interface FamilyTreeViewProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  userGeneration?: number;
  userTreePosition?: UserTreePosition;
  calendarOwnerName?: string;
  canEdit?: boolean;
  onEditDeceased: (deceased: DeceasedPerson) => void;
  onAddDeceased: (initialData?: Partial<DeceasedPerson>) => void;
  onOpenLineage?: (person: DeceasedPerson) => void;
  onOpenTreePosition?: () => void;
}

export const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({
  deceased,
  branches,
  userGeneration = 1,
  userTreePosition,
  calendarOwnerName,
  canEdit = true,
  onEditDeceased,
  onAddDeceased,
  onOpenLineage,
  onOpenTreePosition,
}) => {
  const [selectedMainBranch, setSelectedMainBranch] = useState<string>('all');
  const [selectedGrandparentBranch, setSelectedGrandparentBranch] = useState<string>('all');
  const [selectedGreatGrandparentBranch, setSelectedGreatGrandparentBranch] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [maxGenerationsFilter, setMaxGenerationsFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissingDates, setOnlyMissingDates] = useState(false);

  const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b])), [branches]);

  const branchHierarchy = useMemo(
    () => extractBranchHierarchy(deceased, branches),
    [deceased, branches]
  );

  const visibleGrandparentBranches = useMemo(() => {
    if (selectedMainBranch === 'all') return branchHierarchy.grandparentBranches;
    return branchHierarchy.grandparentBranches.filter((n) => n.parentId === selectedMainBranch);
  }, [branchHierarchy, selectedMainBranch]);

  const visibleGreatGrandparentBranches = useMemo(() => {
    if (selectedGrandparentBranch !== 'all') {
      return branchHierarchy.greatGrandparentBranches.filter((n) => n.parentId === selectedGrandparentBranch);
    }
    if (selectedMainBranch !== 'all') {
      const validGen3Ids = new Set(
        branchHierarchy.grandparentBranches
          .filter((n) => n.parentId === selectedMainBranch)
          .map((n) => n.id)
      );
      return branchHierarchy.greatGrandparentBranches.filter((n) => n.parentId && validGen3Ids.has(n.parentId));
    }
    return branchHierarchy.greatGrandparentBranches;
  }, [branchHierarchy, selectedMainBranch, selectedGrandparentBranch]);

  // Filter persons
  const filtered = deceased.filter(p => {
    if (selectedMainBranch !== 'all' && !matchesBranchHierarchyFilter(p, selectedMainBranch, branches)) return false;
    if (selectedGrandparentBranch !== 'all' && !matchesBranchHierarchyFilter(p, selectedGrandparentBranch, branches)) return false;
    if (selectedGreatGrandparentBranch !== 'all' && !matchesBranchHierarchyFilter(p, selectedGreatGrandparentBranch, branches)) return false;
    if (selectedBranchId !== 'all' && p.branch_id !== selectedBranchId) return false;
    if (maxGenerationsFilter !== 'all') {
      const relGen = getGenerationRelationInfo(p, userGeneration).relativeGeneration;
      if (relGen > Number(maxGenerationsFilter)) return false;
    }
    if (onlyMissingDates && p.hebrew_day && p.hebrew_month) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${p.title || ''} ${p.first_name} ${p.last_name} ${p.father_or_mother_name || ''} ${p.relationship || ''}`.toLowerCase();
      if (!matchName.includes(q)) return false;
    }
    return true;
  });

  // Group by generation
  const generationLabels: Record<number, { title: string; subtitle: string }> = {
    [-2]: { title: 'דור הנינים • דור רביעי', subtitle: 'נינים ובני נינים של המשפחה' },
    [-1]: { title: 'דור הנכדים • דור שלישי', subtitle: 'נכדים ונכדות — המשך השושלת' },
    0: { title: 'דור ההמשך • ילדים', subtitle: 'ילדים וילדות — המשך העץ לדור הבא' },
    1: { title: 'דור 1 • הדור שלי, אחים ובני דודים', subtitle: 'בעל היומן, אחים, אחיות ובני דודים' },
    2: { title: 'דור 2 • הורים ודודים', subtitle: 'אבא, אמא, דודים ודודות' },
    3: { title: 'דור 3 • סבים, סבתות ואחיהם', subtitle: 'סבא וסבתא מצד אב ומצד אם, אחי הסבים והסבתות' },
    4: { title: 'דור 4 • סבא-רבא וסבתא-רבתא', subtitle: 'הורי הסבים והסבתות, אחי סבא-רבא' },
    5: { title: 'דור 5 • סבא-רבא-רבא', subtitle: 'סבא וסבתא של הסבים' },
    6: { title: 'דור 6 • אבות קדמונים', subtitle: 'שורשי המשפחה בדור השישי' },
    7: { title: 'דור 7 • אבות קדמונים', subtitle: 'שורשי המשפחה בדור השביעי' },
    8: { title: 'דור 8 • שורשי השושלת', subtitle: 'אבות ואמהות השושלת בדור השמיני' },
    9: { title: 'דור 9 • אבות השושלת', subtitle: 'מצוקי ארץ וראשי קהילות קודש' },
    10: { title: 'דור 10 • אבות הדורות', subtitle: 'רבנים ומאורי הדור' },
    11: { title: 'דור 11 • מגדולי הדורות', subtitle: 'רבנים ומאורי הדור' },
    12: { title: 'דור 12 • שושלות הדורות וגדולי ישראל', subtitle: 'אבות השושלת ומאורי הדורות' },
  };

  const generations = Array.from(
    new Set(filtered.map((p) => (typeof p.generation === 'number' ? p.generation : 2)))
  ).sort((a, b) => a - b);

  const totalCount = deceased.length;
  const livingCount = deceased.filter((p) => isPersonLiving(p)).length;
  const missingDatesCount = deceased.filter(p => !p.hebrew_day || !p.hebrew_month).length;
  const verifiedCount = totalCount - missingDatesCount;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-l from-amber-500/10 via-amber-100/50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">אילן היוחסין ועץ המשפחה המלא</h2>
            </div>
            <p className="text-sm text-slate-600">
              שורשי המשפחה מדור לדור ודור ההמשך: נפטרים ובני משפחה בחיים מכל ענפי המשפחה{branches.length > 0 ? ` (${branches.map(b => b.name).join(' • ')})` : ''}.
            </p>
          </div>

          {/* Quick Metrics & User Tree Position */}
          <div className="flex items-center gap-3 flex-wrap">
            {onOpenTreePosition && (
              <button
                type="button"
                onClick={onOpenTreePosition}
                className="bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xl px-3.5 py-2 text-right shadow-xs transition cursor-pointer flex items-center gap-2.5"
                title="לחץ כדי לבחור ולהגדיר היכן אתה ממוקם בעץ המשפחה"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-purple-800 font-bold">
                    היכן אני בעץ? (דור {userGeneration})
                  </div>
                  <div className="text-xs font-extrabold text-purple-950 max-w-[180px] truncate">
                    {userTreePosition && userTreePosition.anchorPersonName
                      ? formatUserTreePositionLabel(userTreePosition, calendarOwnerName)
                      : 'לחץ להגדרת המיקום שלך בעץ'}
                  </div>
                </div>
              </button>
            )}
            <div className="bg-white/80 border border-slate-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-medium">סך הכל בעץ</div>
              <div className="text-lg font-bold text-slate-900">{totalCount}</div>
            </div>
            {livingCount > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
                <div className="text-xs text-emerald-700 font-medium">🎂 בחיים</div>
                <div className="text-lg font-bold text-emerald-800">{livingCount}</div>
              </div>
            )}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
              <div className="text-xs text-emerald-700 font-medium">תאריך מאומת</div>
              <div className="text-lg font-bold text-emerald-800">{verifiedCount}</div>
            </div>
            <div 
              onClick={() => setOnlyMissingDates(!onlyMissingDates)}
              className={`border rounded-xl px-3.5 py-2 text-center shadow-xs cursor-pointer transition-all ${
                onlyMissingDates 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105' 
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <div className={`text-xs font-medium ${onlyMissingDates ? 'text-amber-100' : 'text-amber-700'}`}>
                ללא תאריך
              </div>
              <div className="text-lg font-bold">{missingDatesCount}</div>
            </div>
          </div>
        </div>

        {/* Hierarchical Branch Filters & Generation Depth Bar */}
        <div className="mt-5 pt-4 border-t border-amber-200/60 space-y-3">
          {/* Level 1: Main Branch (הורים • דור 2) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-xs font-extrabold text-slate-700">ענף מרכזי:</span>
              <button
                onClick={() => {
                  setSelectedMainBranch('all');
                  setSelectedGrandparentBranch('all');
                  setSelectedGreatGrandparentBranch('all');
                  setSelectedBranchId('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedMainBranch === 'all' && selectedBranchId === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                כל המשפחה ({deceased.length})
              </button>
              {branchHierarchy.mainBranches.map(mb => {
                const isSelected = selectedMainBranch === mb.id;
                const isPaternal = mb.id.includes('פטרנלי');
                return (
                  <button
                    key={mb.id}
                    onClick={() => {
                      setSelectedMainBranch(isSelected ? 'all' : mb.id);
                      setSelectedGrandparentBranch('all');
                      setSelectedGreatGrandparentBranch('all');
                      setSelectedBranchId('all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? isPaternal
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {mb.shortLabel} ({mb.count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={maxGenerationsFilter}
                onChange={(e) => setMaxGenerationsFilter(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer outline-none"
              >
                <option value="all">כל הדורות בעץ (מקסימום)</option>
                <option value="3">עד דור 3 (סבא וסבתא)</option>
                <option value="4">עד דור 4 (סבא-רבא וסבתא-רבתא)</option>
                <option value="5">עד דור 5 (5 דורות)</option>
                <option value="6">עד דור 6 (6 דורות)</option>
                <option value="8">עד דור 8 (8 דורות)</option>
                <option value="10">עד דור 10 (10 דורות)</option>
                <option value="15">עד דור 15 (15 דורות)</option>
              </select>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, קרבה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              {onlyMissingDates && (
                <button
                  onClick={() => setOnlyMissingDates(false)}
                  className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg"
                >
                  הצג הכל
                </button>
              )}
            </div>
          </div>

          {/* Level 2: Grandparents (סבא וסבתא • דור 3) */}
          {visibleGrandparentBranches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/40">
              <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">סבא וסבתא (דור 3):</span>
              <button
                onClick={() => {
                  setSelectedGrandparentBranch('all');
                  setSelectedGreatGrandparentBranch('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedGrandparentBranch === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/90 text-slate-600 border border-slate-200 hover:bg-white'
                }`}
              >
                הכל
              </button>
              {visibleGrandparentBranches.map(gp => {
                const isSelected = selectedGrandparentBranch === gp.id;
                return (
                  <button
                    key={gp.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGrandparentBranch('all');
                        setSelectedGreatGrandparentBranch('all');
                      } else {
                        setSelectedGrandparentBranch(gp.id);
                        if (gp.parentId) setSelectedMainBranch(gp.parentId);
                        setSelectedGreatGrandparentBranch('all');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950'
                        : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {gp.shortLabel} ({gp.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Level 3: Great-Grandparents (סבא-רבא וסבתא-רבתא • דור 4 בלבד) */}
          {visibleGreatGrandparentBranches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/40">
              <Layers className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">סבא-רבא וסבתא-רבתא (דור 4):</span>
              <button
                onClick={() => setSelectedGreatGrandparentBranch('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedGreatGrandparentBranch === 'all'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/90 text-slate-600 border border-slate-200 hover:bg-white'
                }`}
              >
                הכל
              </button>
              {visibleGreatGrandparentBranches.map(ggp => {
                const isSelected = selectedGreatGrandparentBranch === ggp.id;
                return (
                  <button
                    key={ggp.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGreatGrandparentBranch('all');
                      } else {
                        setSelectedGreatGrandparentBranch(ggp.id);
                        if (ggp.parentId) {
                          setSelectedGrandparentBranch(ggp.parentId);
                          const gpNode = branchHierarchy.allNodesById[ggp.parentId];
                          if (gpNode?.parentId) setSelectedMainBranch(gpNode.parentId);
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-950'
                        : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {ggp.shortLabel} ({ggp.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generations Tree Flow */}
      <div className="space-y-10">
        {generations.map((gen) => {
          const genPersons = filtered.filter(
            (p) => (typeof p.generation === 'number' ? p.generation : 2) === gen
          );
          if (genPersons.length === 0) return null;

          const meta = generationLabels[gen] || { title: `דור ${gen}`, subtitle: `אבות קדמונים` };

          return (
            <div key={gen} className="relative">
              {/* Generation Header Divider */}
              <div className="flex items-center gap-4 mb-5">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
                <div className="text-center px-4 py-1.5 bg-slate-900 text-white rounded-full shadow-xs">
                  <span className="text-sm font-bold">{meta.title}</span>
                  <span className="text-xs text-slate-300 mr-2">({genPersons.length})</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
              </div>
              <p className="text-center text-xs text-slate-500 mb-6">{meta.subtitle}</p>

              {/* People Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {genPersons.map((p) => {
                  const branch = branchMap.get(p.branch_id);
                  const living = isPersonLiving(p);
                  const isMissingDate = !p.hebrew_day || !p.hebrew_month;
                  const { cleanTitle, cleanFirstName, cleanLastName, honorific, showTitle } = getDeceasedFormattedParts(p);
                  const genInfo = getGenerationRelationInfo(p, userGeneration);
                  const cleanNotes = cleanLivingMarkerFromText(p.notes);

                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenLineage?.(p)}
                      className={`group bg-white rounded-xl border transition-all duration-200 p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between h-full ${
                        living
                          ? 'border-emerald-200 hover:border-emerald-500 hover:shadow-md'
                          : 'border-slate-200 hover:border-amber-400 hover:shadow-md'
                      }`}
                      title="לחץ לצפייה בשרשרת הייחוס המלאה (בן אחרי בן / בת)"
                    >
                      {/* Top colored stripe matching branch */}
                      <div 
                        className="absolute top-0 right-0 left-0 h-1.5"
                        style={{ backgroundColor: living ? '#059669' : branch?.color || '#2563eb' }}
                      />

                      <div>
                        {/* Top row: Relationship & Branch badge */}
                        <div className="flex items-center justify-between gap-2 mb-2 pt-1 flex-wrap min-h-[26px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {living && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Cake className="w-3 h-3 text-emerald-600" />
                                <span>בחיים</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLineage?.(p);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold border transition cursor-pointer shadow-2xs font-serif ${
                                genInfo.isDirect
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                              }`}
                              title={`${genInfo.fullDescription} • לחץ לצפייה בשרשרת הייחוס`}
                            >
                              <GitCommit className={`w-3 h-3 ${genInfo.isDirect ? 'text-amber-600' : 'text-purple-600'}`} />
                              <span>{genInfo.badgeText}</span>
                            </button>

                            {!living && isHolocaustVictim(p) && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs"
                                title="קדוש השואה הי״ד"
                              >
                                <Flame className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                <span>הי״ד</span>
                              </span>
                            )}
                          </div>

                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold text-white shadow-2xs"
                            style={{ backgroundColor: branch?.color || '#2563eb' }}
                          >
                            {branch?.name || 'ענף משפחתי'}
                          </span>
                        </div>

                        {/* Person Name & Title */}
                        <div className="mb-2 min-h-[68px] flex flex-col justify-center">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                            {showTitle && cleanTitle && <span className="text-amber-700 font-semibold ml-1.5">{cleanTitle}</span>}
                            <span>{cleanFirstName}</span>
                            {cleanLastName && <span>{' '}{cleanLastName}</span>}
                            {!living && honorific && <span className="text-xs text-slate-400 font-normal mr-1.5">{honorific}</span>}
                          </h3>
                          {p.father_or_mother_name && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {living ? 'ייחוס להורים: ' : 'לעילוי נשמת: '}
                              {formatLeiluyNishmat(p)}
                            </p>
                          )}
                        </div>

                        {/* Notes preview */}
                        {cleanNotes && (
                          <p className="text-2xs text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2 mb-3 border border-slate-100">
                            {cleanNotes}
                          </p>
                        )}
                      </div>

                      {/* Date Status Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {isMissingDate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>{canEdit ? 'ללא תאריך • לחץ להשלמה' : 'ללא תאריך מאומת'}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold font-serif ${living ? 'text-emerald-800' : 'text-slate-700'}`}>
                              {living ? (
                                <Cake className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>
                                {living ? 'יום הולדת: ' : ''}
                                {formatDisplayDateWithGregorian(p.hebrew_day, p.hebrew_month, p.hebrew_year, p.gregorian_original_date)}
                              </span>
                            </span>
                          </div>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDeceased(p);
                            }}
                            className="text-slate-400 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                            title={living ? 'ערוך פרטים / מעבר למצב פטירה ח״ו' : 'ערוך פרטי נפטר'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
