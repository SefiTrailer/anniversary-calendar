'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch, UserMembership } from '@/lib/types';
import {
  extractBranchHierarchy,
  matchesBranchHierarchyFilter,
  getGenerationRelationInfo,
  formatCalendarDisplayName,
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
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  branches,
  deceased = [],
  membership,
  calendarName,
  calendarOwnerName,
  onUpdateBranches,
}) => {
  const defaultDisplayName = useMemo(() => formatCalendarDisplayName(calendarName), [calendarName]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [maxGen, setMaxGen] = useState<string>('all');
  const [customCalName, setCustomCalName] = useState<string>('');
  const [copied, setCopied] = useState(false);
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

      const savedCalName = raw.find((s) => s.startsWith('calName:'));
      setCustomCalName(savedCalName ? savedCalName.replace(/^calName:/, '') : formatCalendarDisplayName(calendarName));
    } else {
      setSelectedBranches(allIds);
      setSelectedSubBranch('all');
      setMaxGen('all');
      setCustomCalName(formatCalendarDisplayName(calendarName));
    }
  }, [membership, branches, isOpen, calendarName]);

  const persistSelection = async (
    nextUuids: string[],
    nextSub: string,
    nextMaxGen: string,
    nextCalName: string = customCalName
  ) => {
    const combined: string[] = [...nextUuids];
    if (nextSub && nextSub !== 'all') combined.push(nextSub);
    if (nextMaxGen && nextMaxGen !== 'all') combined.push(`maxGen:${nextMaxGen}`);
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

  // Compute how many deceased with valid dates match the current sync settings
  const matchingDeceasedCount = useMemo(() => {
    const userGen = membership?.user_generation ?? 1;
    return deceased.filter((d) => {
      if (!d.hebrew_day || !d.hebrew_month) return false;
      if (selectedBranches.length > 0 && !selectedBranches.includes(d.branch_id)) return false;
      if (selectedSubBranch !== 'all' && !matchesBranchHierarchyFilter(d, selectedSubBranch, branches)) {
        return false;
      }
      if (maxGen !== 'all') {
        const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
        if (relGen > Number(maxGen)) return false;
      }
      return true;
    }).length;
  }, [deceased, selectedBranches, selectedSubBranch, maxGen, branches, membership]);

  if (!isOpen) return null;

  const token = membership?.feed_token || 'demo-token-default';
  const effectiveCalName = customCalName.trim() || defaultDisplayName;
  const queryParams = new URLSearchParams({ v: '4' });
  if (selectedSubBranch !== 'all') queryParams.set('subBranch', selectedSubBranch);
  if (maxGen !== 'all') queryParams.set('maxGen', maxGen);
  if (effectiveCalName !== defaultDisplayName) queryParams.set('calName', effectiveCalName);
  const queryString = queryParams.toString();
  const httpsUrl = `${origin}/api/calendar/${token}.ics?${queryString}`;
  const webcalUrl = `${origin.replace(/^https?:/, 'webcal:')}/api/calendar/${token}.ics?${queryString}`;

  const toggleBranch = async (branchId: string) => {
    const updated = selectedBranches.includes(branchId)
      ? selectedBranches.filter((id) => id !== branchId)
      : [...selectedBranches, branchId];

    setSelectedBranches(updated);
    await persistSelection(updated, selectedSubBranch, maxGen, customCalName);
  };

  const selectAll = async () => {
    const all = branches.map((b) => b.id);
    setSelectedBranches(all);
    setSelectedSubBranch('all');
    await persistSelection(all, 'all', maxGen, customCalName);
  };

  const handleSubBranchChange = async (nextSub: string) => {
    setSelectedSubBranch(nextSub);
    const all = branches.map((b) => b.id);
    setSelectedBranches(all);
    await persistSelection(all, nextSub, maxGen, customCalName);
  };

  const handleMaxGenChange = async (nextMaxGen: string) => {
    setMaxGen(nextMaxGen);
    await persistSelection(selectedBranches, selectedSubBranch, nextMaxGen, customCalName);
  };

  const handleSaveCalName = async (nextName: string) => {
    setCustomCalName(nextName);
    await persistSelection(selectedBranches, selectedSubBranch, maxGen, nextName);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(httpsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const googleCalendarSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    webcalUrl
  )}`;

  const ownerDisplay = calendarOwnerName || membership?.user_name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-blue-200" />
            <div>
              <h2 className="text-lg font-bold">סנכרון ימי פטירה ליומן גוגל (Google Calendar)</h2>
              <p className="text-xs text-blue-100">
                בחר את שם היומן, הענף וכמה דורות מהעץ ברצונך להכניס ליומן שלך
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
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 0. Calendar Display Name & Owner Description */}
          <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  שם היומן כפי שיופיע ב-Google Calendar:
                </h3>
              </div>
              {customCalName !== defaultDisplayName && (
                <button
                  type="button"
                  onClick={() => handleSaveCalName(defaultDisplayName)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>איפוס לברירת מחדל</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customCalName}
                onChange={(e) => setCustomCalName(e.target.value)}
                onBlur={() => persistSelection(selectedBranches, selectedSubBranch, maxGen, customCalName)}
                placeholder={defaultDisplayName}
                className="flex-1 text-sm font-bold text-slate-900 bg-white border border-amber-300 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-600">
              <strong>תיאור היומן שיצורף אוטומטית:</strong>{' '}
              לוח ימי פטירה (יארצייט) מתעדכן אוטומטית{ownerDisplay ? ` | בעל היומן: ${ownerDisplay}` : ''}
            </p>
          </div>

          {/* 1. Generation Depth Selection */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-blue-700 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. כמה דורות מהעץ ברצונך להכניס ליומן שלך?
                </h3>
              </div>
              <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                {matchingDeceasedCount} ימי זיכרון פעילים
              </span>
            </div>
            <p className="text-xs text-slate-600">
              העץ המלא מכיל את מקסימום הדורות. תוכל לבחור לסנכרן את כל הדורות, או להגביל עד דור מסוים בלבד:
            </p>
            <select
              value={maxGen}
              onChange={(e) => handleMaxGenChange(e.target.value)}
              className="w-full text-sm font-bold text-slate-800 bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">הכל — כל הדורות בעץ (מקסימום דורות)</option>
              <option value="3">עד דור 3 בלבד (הורים, סבא וסבתא)</option>
              <option value="4">עד דור 4 בלבד (כולל סבא-רבא וסבתא-רבתא)</option>
              <option value="5">עד דור 5 (בני נינים / 5 דורות)</option>
              <option value="6">עד דור 6 (6 דורות)</option>
              <option value="8">עד דור 8 (8 דורות)</option>
              <option value="10">עד דור 10 (10 דורות)</option>
              <option value="15">עד דור 15 (15 דורות)</option>
              <option value="20">עד דור 20 (20 דורות)</option>
            </select>
          </div>

          {/* 2. Hierarchical Branch / Sub-Branch Selection (Up to Generation 4) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  2. שיוך לענף מרכזי או תת-ענף (עד דור סבא-רבא וסבתא-רבתא):
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

            {/* Legacy Branch Checkboxes */}
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
                שומר את הגדרות הסנכרון שלך... הפיד מתעדכן אוטומטית!
              </span>
            )}
          </div>

          {/* 3. Feed URL & Direct Google Button */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              3. התחברות ליומן בלחיצה אחת:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={googleCalendarSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition transform active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>הוסף בלחיצה ל-Google Calendar</span>
              </a>

              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm shadow-sm transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">הקישור הועתק בהצלחה!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>העתק קישור מנוי (URL)</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 truncate text-left">
              {httpsUrl}
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>איך מוסיפים ידנית ביומן גוגל במחשב או בטלפון?</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 pr-1 leading-relaxed text-slate-700">
              <li>פותחים את <strong>Google Calendar</strong> בדפדפן.</li>
              <li>בתפריט הצדדי ליד <strong>״יומנים אחרים״</strong> (Other calendars), לוחצים על <strong>+</strong> ובוחרים <strong>״מכתובת URL״</strong> (From URL).</li>
              <li>מדביקים את הקישור שהועתק למעלה ולוחצים <strong>״הוסף יומן״</strong>.</li>
            </ol>
            <p className="text-[11px] text-amber-800 pt-1">
              ✨ מעתה והלאה, ימי השנה של הנפטרים בענף ובמספר הדורות שבחרת יתעדכנו אוטומטית בכל שנה!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <a
            href={httpsUrl}
            download="yahrzeits.ics"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>הורד כקובץ .ICS חד-פעמי ({matchingDeceasedCount} נפטרים)</span>
          </a>

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
