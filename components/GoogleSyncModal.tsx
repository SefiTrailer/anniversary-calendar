'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch, UserMembership } from '@/lib/types';
import {
  extractBranchHierarchy,
  matchesBranchHierarchyFilter,
  getGenerationRelationInfo,
  formatCalendarDisplayName,
  formatSimchaCalendarDisplayName,
  isPersonLiving,
} from '@/lib/hebrew-calendar';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Download,
  Calendar,
  HelpCircle,
  GitBranch,
  GitCommit,
  Layers,
  Edit3,
  RotateCcw,
  Cake,
  Flame,
  Sunset,
} from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: FamilyBranch[];
  deceased?: DeceasedPerson[];
  membership: UserMembership | null;
  calendarName: string;
  calendarOwnerName?: string;
  onUpdateBranches: (selectedBranchIds: string[]) => Promise<void>;
  onOpenHebrewCalendarModal?: () => void;
}

const GENERATION_CHIPS = [
  { gen: 1, label: 'דור 1 (הדור שלי / ילדים)' },
  { gen: 2, label: 'דור 2 (הורים ודודים)' },
  { gen: 3, label: 'דור 3 (סבים וסבתות)' },
  { gen: 4, label: 'דור 4 (סבא-רבא)' },
  { gen: 5, label: 'דור 5 (חימשים)' },
  { gen: 6, label: 'דור 6 (6 דורות אחורה)' },
  { gen: 7, label: 'דור 7 (7 דורות אחורה)' },
  { gen: 8, label: 'דור 8+ (דורות קדומים)' },
];

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  branches,
  deceased = [],
  membership,
  calendarName,
  calendarOwnerName,
  onUpdateBranches,
  onOpenHebrewCalendarModal,
}) => {
  const defaultDisplayName = useMemo(() => formatCalendarDisplayName(calendarName), [calendarName]);
  const simchaDisplayName = useMemo(() => formatSimchaCalendarDisplayName(calendarName), [calendarName]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [maxGen, setMaxGen] = useState<string>('all');
  const [skippedGens, setSkippedGens] = useState<number[]>([]);
  const [customCalName, setCustomCalName] = useState<string>('');
  const [copiedMemorials, setCopiedMemorials] = useState(false);
  const [copiedSimchas, setCopiedSimchas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  const branchHierarchy = useMemo(
    () => extractBranchHierarchy(deceased, branches),
    [deceased, branches]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    const allIds = branches.map((b) => b.id);
    if (membership && Array.isArray(membership.selected_branch_ids)) {
      const raw = membership.selected_branch_ids;
      const uuids = raw.filter((id) => allIds.includes(id));
      setSelectedBranches(uuids.length > 0 ? uuids : allIds);

      const savedSub = raw.find((s) => s.startsWith('gen2:') || s.startsWith('gen3:') || s.startsWith('gen4:'));
      setSelectedSubBranch(savedSub || 'all');

      const savedMaxGen = raw.find((s) => s.startsWith('maxGen:'));
      setMaxGen(savedMaxGen ? savedMaxGen.replace('maxGen:', '') : 'all');

      const savedSkipped = raw
        .filter((s) => s.startsWith('skipGen:'))
        .map((s) => Number(s.replace('skipGen:', '')))
        .filter((n) => !Number.isNaN(n));
      setSkippedGens(savedSkipped);

      const savedCalName = raw.find((s) => s.startsWith('calName:'));
      setCustomCalName(savedCalName ? savedCalName.replace(/^calName:/, '') : formatCalendarDisplayName(calendarName));
    } else {
      setSelectedBranches(allIds);
      setSelectedSubBranch('all');
      setMaxGen('all');
      setSkippedGens([]);
      setCustomCalName(formatCalendarDisplayName(calendarName));
    }
  }, [membership, branches, isOpen, calendarName]);

  const persistSelection = async (
    nextUuids: string[],
    nextSub: string,
    nextMaxGen: string,
    nextSkippedGens: number[] = skippedGens,
    nextCalName: string = customCalName
  ) => {
    const combined: string[] = [...nextUuids];
    if (nextSub && nextSub !== 'all') combined.push(nextSub);
    if (nextMaxGen && nextMaxGen !== 'all') combined.push(`maxGen:${nextMaxGen}`);
    nextSkippedGens.forEach((g) => combined.push(`skipGen:${g}`));
    const cleanName = nextCalName.trim();
    if (cleanName && cleanName !== defaultDisplayName) {
      combined.push(`calName:${cleanName}`);
    }

    setIsSaving(true);
    try {
      await onUpdateBranches(combined);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute how many memorials vs simchas match the current sync settings
  const { matchingMemorialsCount, matchingSimchasCount } = useMemo(() => {
    const userGen = membership?.user_generation ?? 1;
    let memorials = 0;
    let simchas = 0;

    deceased.forEach((d) => {
      if (!d.hebrew_day || !d.hebrew_month) return;
      if (selectedBranches.length > 0 && !selectedBranches.includes(d.branch_id)) return;
      if (selectedSubBranch !== 'all' && !matchesBranchHierarchyFilter(d, selectedSubBranch, branches)) {
        return;
      }
      const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
      const normalizedGen = relGen >= 8 ? 8 : relGen <= 1 ? 1 : relGen;
      if (maxGen !== 'all' && relGen > Number(maxGen)) return;
      if (skippedGens.includes(relGen) || (relGen >= 8 && skippedGens.includes(8))) return;
      if (skippedGens.includes(normalizedGen)) return;

      if (isPersonLiving(d)) {
        simchas++;
      } else {
        memorials++;
      }
    });

    return { matchingMemorialsCount: memorials, matchingSimchasCount: simchas };
  }, [deceased, selectedBranches, selectedSubBranch, maxGen, skippedGens, branches, membership]);

  if (!isOpen) return null;

  const token = membership?.feed_token || 'demo-token-default';
  const effectiveCalName = customCalName.trim() || defaultDisplayName;

  const buildFeedUrls = (feedType: 'memorials' | 'simchas') => {
    const queryParams = new URLSearchParams({ v: '5', type: feedType });
    if (selectedSubBranch !== 'all') queryParams.set('subBranch', selectedSubBranch);
    if (maxGen !== 'all') queryParams.set('maxGen', maxGen);
    if (skippedGens.length > 0) queryParams.set('skipGens', skippedGens.join(','));
    if (feedType === 'memorials' && effectiveCalName !== defaultDisplayName) {
      queryParams.set('calName', effectiveCalName);
    }
    const qs = queryParams.toString();
    const https = `${origin}/api/calendar/${token}.ics?${qs}`;
    const webcal = `${origin.replace(/^https?:/, 'webcal:')}/api/calendar/${token}.ics?${qs}`;
    const googleSub = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
    return { https, webcal, googleSub };
  };

  const memorialsUrls = buildFeedUrls('memorials');
  const simchasUrls = buildFeedUrls('simchas');

  const toggleBranch = async (branchId: string) => {
    const updated = selectedBranches.includes(branchId)
      ? selectedBranches.filter((id) => id !== branchId)
      : [...selectedBranches, branchId];

    setSelectedBranches(updated);
    await persistSelection(updated, selectedSubBranch, maxGen, skippedGens, customCalName);
  };

  const selectAll = async () => {
    const all = branches.map((b) => b.id);
    setSelectedBranches(all);
    setSelectedSubBranch('all');
    await persistSelection(all, 'all', maxGen, skippedGens, customCalName);
  };

  const handleSubBranchChange = async (nextSub: string) => {
    setSelectedSubBranch(nextSub);
    const all = branches.map((b) => b.id);
    setSelectedBranches(all);
    await persistSelection(all, nextSub, maxGen, skippedGens, customCalName);
  };

  const handleMaxGenChange = async (nextMaxGen: string) => {
    setMaxGen(nextMaxGen);
    await persistSelection(selectedBranches, selectedSubBranch, nextMaxGen, skippedGens, customCalName);
  };

  const toggleSkipGeneration = async (genNumber: number) => {
    const nextSkipped = skippedGens.includes(genNumber)
      ? skippedGens.filter((g) => g !== genNumber)
      : [...skippedGens, genNumber];
    setSkippedGens(nextSkipped);
    await persistSelection(selectedBranches, selectedSubBranch, maxGen, nextSkipped, customCalName);
  };

  const handleSaveCalName = async (nextName: string) => {
    setCustomCalName(nextName);
    await persistSelection(selectedBranches, selectedSubBranch, maxGen, skippedGens, nextName);
  };

  const copyMemorialsUrl = () => {
    navigator.clipboard.writeText(memorialsUrls.https);
    setCopiedMemorials(true);
    setTimeout(() => setCopiedMemorials(false), 2500);
  };

  const copySimchasUrl = () => {
    navigator.clipboard.writeText(simchasUrls.https);
    setCopiedSimchas(true);
    setTimeout(() => setCopiedSimchas(false), 2500);
  };

  const ownerDisplay = calendarOwnerName || membership?.user_name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-800 via-indigo-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-amber-300" />
            <div>
              <h2 className="text-lg font-bold">סנכרון לוח שנה משפחתי ל-Google Calendar (שני יומנים בצבעים שונים)</h2>
              <p className="text-xs text-blue-100">
                בחר אילו דורות וענפים לסנכרן, והוסף בנפרד את יומן ימי הזיכרון ואת יומן השמחות כדי שיופיעו ב-2 צבעים!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* 1. Generation Depth Selection & Skipping Specific Generations */}
          <div className="bg-blue-50/70 border border-blue-200/90 rounded-xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-blue-700 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. סינון דורות ליומן — כמה דורות להכניס, ועל אילו דורות לוותר?
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                  🕯️ {matchingMemorialsCount} ימי זיכרון
                </span>
                <span className="text-xs font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  🎂💍 {matchingSimchasCount} שמחות
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                הגבלת עומק דורות מקסימלי (למשל: בלי 6–7 דורות אחורה):
              </label>
              <select
                value={maxGen}
                onChange={(e) => handleMaxGenChange(e.target.value)}
                className="w-full text-sm font-bold text-slate-800 bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">הכל — כל הדורות בעץ (ללא הגבלת תקרה)</option>
                <option value="2">עד דור 2 בלבד (הורים, אחים וילדים)</option>
                <option value="3">עד דור 3 בלבד (כולל סבא וסבתא)</option>
                <option value="4">עד דור 4 בלבד (כולל סבא-רבא וסבתא-רבתא)</option>
                <option value="5">עד דור 5 בלבד (מוותר על דורות 6–7 ומעלה)</option>
                <option value="6">עד דור 6 בלבד (מוותר על דור 7 ומעלה)</option>
                <option value="7">עד דור 7 בלבד</option>
              </select>
            </div>

            {/* Specific Generation Toggle Chips */}
            <div className="pt-2 border-t border-blue-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  רוצה &quot;לוותר&quot; על דור ספציפי? לחץ על דור כדי להסיר או להחזיר אותו ליומן:
                </span>
                {skippedGens.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkippedGens([]);
                      persistSelection(selectedBranches, selectedSubBranch, maxGen, [], customCalName);
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    החזר את כל הדורות
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {GENERATION_CHIPS.map((chip) => {
                  const isExceededByMax = maxGen !== 'all' && chip.gen > Number(maxGen);
                  const isSkipped = skippedGens.includes(chip.gen) || isExceededByMax;
                  return (
                    <button
                      key={chip.gen}
                      type="button"
                      disabled={isExceededByMax}
                      onClick={() => toggleSkipGeneration(chip.gen)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        isSkipped
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          : 'bg-white text-blue-900 border-blue-300 shadow-2xs hover:bg-blue-50'
                      }`}
                    >
                      <span>{isSkipped ? '✕' : '✓'}</span>
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Hierarchical Branch / Sub-Branch Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  2. סינון לפי ענף משפחתי או תת-ענף:
                </h3>
              </div>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
              >
                כל הענפים
              </button>
            </div>

            <select
              value={selectedSubBranch}
              onChange={(e) => handleSubBranchChange(e.target.value)}
              className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">כל המשפחה (כל הענפים ותתי-הענפים)</option>

              {branchHierarchy.mainBranches.length > 0 && (
                <optgroup label="── ענף מרכזי (הורים • דור 2) ──">
                  {branchHierarchy.mainBranches.map((mb) => (
                    <option key={mb.id} value={mb.id}>
                      {mb.label} ({mb.count} בעץ)
                    </option>
                  ))}
                </optgroup>
              )}

              {branchHierarchy.grandparentBranches.length > 0 && (
                <optgroup label="── תת-ענף סבא וסבתא (דור 3) ──">
                  {branchHierarchy.grandparentBranches.map((gp) => (
                    <option key={gp.id} value={gp.id}>
                      {gp.label} ({gp.count} בעץ)
                    </option>
                  ))}
                </optgroup>
              )}

              {branchHierarchy.greatGrandparentBranches.length > 0 && (
                <optgroup label="── תת-ענף סבא-רבא וסבתא-רבתא (דור 4) ──">
                  {branchHierarchy.greatGrandparentBranches.map((ggp) => (
                    <option key={ggp.id} value={ggp.id}>
                      {ggp.label} ({ggp.count} בעץ)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="pt-2 border-t border-slate-200/80">
              <p className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>או סינון לפי ענפי היומן הראשיים:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {branches.map((b) => {
                  const isChecked = selectedBranches.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBranch(b.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold">{b.name}</span>
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: b.color || '#2563eb' }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {isSaving && (
              <span className="text-[11px] text-blue-600 font-medium block mt-1 animate-pulse">
                שומר את הגדרות הסנכרון שלך... הפידים מתעדכנים אוטומטית!
              </span>
            )}
          </div>

          {/* 3. TWO SEPARATE CALENDARS FOR DIFFERENT COLORS IN GOOGLE CALENDAR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                3. הוספה ל-Google Calendar בשני יומנים נפרדים (כדי שיופיעו בצבעים שונים!):
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calendar 1: Memorials (Yahrzeits) */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      <span>יומן 1 • ימי זיכרון (יארצייט)</span>
                    </span>
                    <span className="text-xs font-bold text-amber-900">{matchingMemorialsCount} נפטרים</span>
                  </div>

                  {/* Custom Calendar Name for Memorials */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-amber-700" />
                        <span>שם יומן ימי הזיכרון:</span>
                      </span>
                      {customCalName !== defaultDisplayName && (
                        <button
                          type="button"
                          onClick={() => handleSaveCalName(defaultDisplayName)}
                          className="text-amber-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>איפוס</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customCalName}
                      onChange={(e) => setCustomCalName(e.target.value)}
                      onBlur={() =>
                        persistSelection(selectedBranches, selectedSubBranch, maxGen, skippedGens, customCalName)
                      }
                      placeholder={defaultDisplayName}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-1.5">
                    <Sunset className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>זמנים הלכתיים מדויקים:</strong> כל אירוע יארצייט מתחיל בדיוק ב<strong>צאת הכוכבים</strong> בערב שלפני ומסתיים ב<strong>שקיעת החמה</strong> ביום היארצייט עצמו.
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={memorialsUrls.googleSub}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🕯️ הוסף יומן ימי זיכרון ל-Google</span>
                  </a>

                  <button
                    type="button"
                    onClick={copyMemorialsUrl}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    {copiedMemorials ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">קישור יומן הזיכרון הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>העתק קישור URL (יומן ימי זיכרון)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Calendar 2: Simchas (Birthdays & Anniversaries) */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <Cake className="w-3.5 h-3.5 text-emerald-600" />
                      <span>יומן 2 • ימי הולדת ושמחות (בצבע נפרד!)</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-900">{matchingSimchasCount} שמחות</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="block text-[11px] font-bold text-slate-700">שם יומן השמחות ב-Google:</span>
                    <div className="w-full text-xs font-bold text-emerald-950 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 truncate">
                      {simchaDisplayName}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-200 text-[11px] text-emerald-950">
                    <strong>יומן נפרד בצבע שונה:</strong> הוספת יומן זה יוצרת יומן שני ב-Google Calendar עבור 🎂 ימי הולדת עבריים, 💍 ימי נישואין ו-🥂 שמחות משפחתיות — כך שיופיעו בצבע נפרד מיומן היארצייט!
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={simchasUrls.googleSub}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🎂💍 הוסף יומן שמחות ל-Google</span>
                  </a>

                  <button
                    type="button"
                    onClick={copySimchasUrl}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    {copiedSimchas ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">קישור יומן השמחות הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>העתק קישור URL (יומן שמחות)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {ownerDisplay && (
              <p className="text-[11px] text-slate-500 text-center">
                תיאור היומנים שיצורף אוטומטית ב-Google Calendar כולל: <strong>בעל היומן: {ownerDisplay}</strong>
              </p>
            )}

            {/* Calendar 3: Automatic Hebrew Dates, Shabbatot, Fasts, Holidays & Daily Zmanim */}
            {onOpenHebrewCalendarModal && (
              <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-l from-purple-50/80 via-indigo-50/50 to-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-950 border border-purple-300">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    <span>יומן 3 • תאריך עברי, שבתות, חגים, צומות וזמני היום (בצבע נפרד!)</span>
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    רוצה גם תאריך עברי יומי, פרשת השבוע וזמני כניסת שבת, חגים, צומות וזמני היום לבחירה ביומן נפרד?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHebrewCalendarModal();
                  }}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  📅 התאם והוסף יומן עברי וזמנים &larr;
                </button>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>איך שני היומנים מופיעים בצבעים שונים ב-Google Calendar?</span>
            </div>
            <p className="leading-relaxed">
              כשלוחצים על שני הכפתורים למעלה (<strong>יומן ימי זיכרון</strong> ו-<strong>יומן שמחות</strong>), גוגל מוסיף אותם בתור <strong>שני יומנים נפרדים</strong> תחת &quot;יומנים אחרים&quot; ונותן לכל אחד צבע שונה אוטומטית (ותוכלו גם לבחור לכל אחד מהם כל צבע שתרצו בלחיצה על 3 הנקודות ליד שם היומן בגוגל).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <a
              href={memorialsUrls.https}
              download="yahrzeits.ics"
              className="inline-flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-950 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>הורד קובץ ימי זיכרון (.ICS)</span>
            </a>
            <a
              href={simchasUrls.https}
              download="simchas.ics"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>הורד קובץ שמחות (.ICS)</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-sm cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
