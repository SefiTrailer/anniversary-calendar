'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  Check,
  Copy,
  Calendar as CalendarIcon,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  Edit3,
  UserPlus,
  Trash2,
  Users,
  RefreshCw,
  GitBranch,
  GitCommit,
} from 'lucide-react';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from '@/lib/types';
import {
  extractBranchHierarchy,
  matchesBranchHierarchyFilter,
  getGenerationRelationInfo,
  formatCalendarDisplayName,
} from '@/lib/hebrew-calendar';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarProject | null;
  branches: FamilyBranch[];
  deceased: DeceasedPerson[];
  feedToken?: string;
  isAdmin?: boolean;
  members?: UserMembership[];
  onManageMember?: (email: string, name: string, role: 'admin' | 'editor' | 'member', branchIds: string[]) => Promise<void>;
  onRemoveMember?: (email: string) => Promise<void>;
}

export const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({
  isOpen,
  onClose,
  calendar,
  branches,
  deceased,
  feedToken = 'shared',
  isAdmin = false,
  members = [],
  onManageMember,
  onRemoveMember,
}) => {
  // By default, select all branches
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() =>
    branches.map((b) => b.id)
  );
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [maxGen, setMaxGen] = useState<string>('all');
  const [customCalName, setCustomCalName] = useState<string>('');
  const [shareRole, setShareRole] = useState<'member' | 'editor'>('member');
  const [copiedWebLink, setCopiedWebLink] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'editor'>('editor');
  const [savingMember, setSavingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);

  const branchHierarchy = useMemo(
    () => extractBranchHierarchy(deceased, branches),
    [deceased, branches]
  );

  // Sync selected branches when branches change
  React.useEffect(() => {
    if (branches.length > 0) {
      setSelectedBranchIds(branches.map((b) => b.id));
    }
  }, [branches]);

  React.useEffect(() => {
    if (calendar?.name) {
      setCustomCalName(formatCalendarDisplayName(calendar.name));
    }
  }, [calendar?.name, isOpen]);

  if (!isOpen || !calendar) return null;

  const defaultDisplayName = formatCalendarDisplayName(calendar.name);
  const effectiveCalName = customCalName.trim() || defaultDisplayName;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yomzikaron.vercel.app';

  // Toggle single branch
  const toggleBranch = (id: string) => {
    if (selectedBranchIds.includes(id)) {
      if (selectedBranchIds.length === 1) return; // Keep at least one
      setSelectedBranchIds(selectedBranchIds.filter((bId) => bId !== id));
    } else {
      setSelectedBranchIds([...selectedBranchIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
    setSelectedSubBranch('all');
  };
  const isAllSelected = selectedBranchIds.length === branches.length && selectedSubBranch === 'all';
  const isPartialSelected = !isAllSelected;

  // Compute deceased count matching selected branches, subBranch, and maxGen
  const selectedDeceasedCount = deceased.filter((d) => {
    if (!selectedBranchIds.includes(d.branch_id)) return false;
    if (selectedSubBranch !== 'all' && !matchesBranchHierarchyFilter(d, selectedSubBranch, branches)) return false;
    if (maxGen !== 'all') {
      const relGen = getGenerationRelationInfo(d, 1).relativeGeneration;
      if (relGen > Number(maxGen)) return false;
    }
    return true;
  }).length;

  // Selected branch names
  const selectedBranchNames = branches
    .filter((b) => selectedBranchIds.includes(b.id))
    .map((b) => b.name);

  // Generate web share link
  const branchParam = selectedBranchIds.join(',');
  const roleParam = shareRole === 'editor' ? '&role=editor' : '';
  const subBranchParam = selectedSubBranch !== 'all' ? `&subBranch=${encodeURIComponent(selectedSubBranch)}` : '';
  const maxGenParam = maxGen !== 'all' ? `&maxGen=${encodeURIComponent(maxGen)}` : '';
  const webShareUrl = `${origin}/?share=true&calendarId=${calendar.id}&branches=${branchParam}${subBranchParam}${maxGenParam}${roleParam}`;

  // Generate iCal / WebCal sync link (only include query params if a specific partial filter is chosen)
  const protocol = origin.startsWith('https') ? 'webcal:' : 'http:';
  const cleanHost = origin.replace(/^https?:\/\//, '');
  const effectiveToken = feedToken && feedToken !== 'shared' ? feedToken : calendar.id;
  const syncQuery = new URLSearchParams({ v: '4' });
  if (!isAllSelected && selectedBranchIds.length > 0) syncQuery.set('branches', branchParam);
  if (selectedSubBranch !== 'all') syncQuery.set('subBranch', selectedSubBranch);
  if (maxGen !== 'all') syncQuery.set('maxGen', maxGen);
  if (effectiveCalName !== defaultDisplayName) syncQuery.set('calName', effectiveCalName);
  const syncQueryStr = syncQuery.toString();
  const webcalUrl = `${protocol}//${cleanHost}/api/calendar/${effectiveToken}.ics${syncQueryStr ? `?${syncQueryStr}` : ''}`;
  const httpsSyncUrl = `${origin}/api/calendar/${effectiveToken}.ics${syncQueryStr ? `?${syncQueryStr}` : ''}`;
  const directGoogleAddUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  // Copy helper
  const handleCopy = async (text: string, type: 'web' | 'sync') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'web') {
        setCopiedWebLink(true);
        setTimeout(() => setCopiedWebLink(false), 2500);
      } else {
        setCopiedSyncLink(true);
        setTimeout(() => setCopiedSyncLink(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const subNode = selectedSubBranch !== 'all' ? branchHierarchy.allNodesById[selectedSubBranch] : null;
    const branchLabel = subNode
      ? subNode.shortLabel
      : isAllSelected
      ? 'כל הענפים'
      : selectedBranchNames.join(' + ');
    const genLabel = maxGen !== 'all' ? ` • עד דור ${maxGen}` : ' • כל הדורות';
    const roleLabel = shareRole === 'editor' ? 'כולל הרשאת עריכה והוספה' : 'צפייה וסנכרון ליומן';
    const text = `שלום! מצורף קישור ליומן הזיכרון והיארצייט המשפחתי עבור *${effectiveCalName}* (ענף: ${branchLabel}${genLabel} • ${roleLabel}):\n\n${webShareUrl}\n\nהקישור מציג את תאריכי היארצייט העבריים, אזכרות קרובות, ואפשרות להוסיף ישירות ליומן Google שלך בלחיצה אחת (כל שינוי ביומן מתעדכן אוטומטית אצל כולם).`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleAddOrUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onManageMember || !newMemberEmail.trim()) return;
    setSavingMember(true);
    setMemberMessage(null);
    try {
      const payloadBranches = [...selectedBranchIds];
      if (selectedSubBranch !== 'all') payloadBranches.push(selectedSubBranch);
      if (maxGen !== 'all') payloadBranches.push(`maxGen:${maxGen}`);

      await onManageMember(
        newMemberEmail.trim().toLowerCase(),
        newMemberName.trim() || newMemberEmail.trim().split('@')[0],
        newMemberRole,
        payloadBranches
      );
      setNewMemberEmail('');
      setNewMemberName('');
      setMemberMessage('הרשאת המשתמש נשמרה ועודכנה בהצלחה!');
      setTimeout(() => setMemberMessage(null), 3500);
    } catch (err: any) {
      setMemberMessage(err.message || 'שגיאה בעדכון הרשאות');
    } finally {
      setSavingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[92vh] overflow-y-auto relative text-right">
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 sticky top-0 z-10" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 sticky top-2 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                שיתוף יומן וניהול הרשאות (צפייה / עריכה)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {formatCalendarDisplayName(calendar.name, customCalName)} &bull; בעל היומן: {calendar.created_by_user_name || 'מנהל היומן'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Auto-Sync Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
            <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">סנכרון אוטומטי מלא לכולם:</span>
              <span className="text-emerald-800 leading-relaxed block">
                כל הוספת שם או עדכון תאריך שמבוצעים על ידך (או על ידי מי שנתת לו הרשאת עריכה) מתעדכנים אוטומטית באתר ובכל יומני Google של כל המשתמשים שחיברו את היומן, ללא צורך בפעולה מצדם.
              </span>
            </div>
          </div>

          {/* Customizable Calendar Display Name */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800">
                שם היומן כפי שיופיע אצל מקבלי הקישור ב-Google Calendar:
              </label>
              {customCalName.trim() !== defaultDisplayName && (
                <button
                  type="button"
                  onClick={() => setCustomCalName(defaultDisplayName)}
                  className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  אפס לברירת מחדל ({defaultDisplayName})
                </button>
              )}
            </div>
            <input
              type="text"
              value={customCalName}
              onChange={(e) => setCustomCalName(e.target.value)}
              placeholder={defaultDisplayName}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-[11px] text-slate-500">
              בתיאור היומן ב-Google Calendar יופיע אוטומטית: <strong className="text-slate-700">בעל היומן: {calendar.created_by_user_name || 'מנהל היומן'}</strong>
            </p>
          </div>

          {/* Step 1: Branch, Sub-Branch & Generation Depth Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                1. בחר שיוך לענף / תת-ענף ומספר דורות מהעץ:
              </label>
              <div className="flex items-center gap-2 text-xs">
                {isPartialSelected && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    שיתוף מותאם אישית
                  </span>
                )}
                {!isAllSelected && (
                  <button
                    onClick={selectAll}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                  >
                    בחר הכל
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Branch Dropdown (Gen 2 / Gen 3 / Gen 4) & Max Generations Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ענף מרכזי / תת-ענף (עד דור 4):</span>
                </label>
                <select
                  value={selectedSubBranch}
                  onChange={(e) => setSelectedSubBranch(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                >
                  <option value="all">כל הענפים ותתי-הענפים</option>
                  {branchHierarchy.mainBranches.length > 0 && (
                    <optgroup label="── ענף מרכזי (הורים • דור 2) ──">
                      {branchHierarchy.mainBranches.map((mb) => (
                        <option key={mb.id} value={mb.id}>
                          {mb.shortLabel} ({mb.count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {branchHierarchy.grandparentBranches.length > 0 && (
                    <optgroup label="── סבא וסבתא (דור 3) ──">
                      {branchHierarchy.grandparentBranches.map((gp) => (
                        <option key={gp.id} value={gp.id}>
                          {gp.shortLabel} ({gp.count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {branchHierarchy.greatGrandparentBranches.length > 0 && (
                    <optgroup label="── סבא-רבא וסבתא-רבתא (דור 4) ──">
                      {branchHierarchy.greatGrandparentBranches.map((ggp) => (
                        <option key={ggp.id} value={ggp.id}>
                          {ggp.shortLabel} ({ggp.count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                  <GitCommit className="w-3.5 h-3.5 text-blue-600" />
                  <span>כמה דורות מהעץ להכניס ליומן?</span>
                </label>
                <select
                  value={maxGen}
                  onChange={(e) => setMaxGen(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                >
                  <option value="all">הכל — כל הדורות בעץ (מקסימום)</option>
                  <option value="3">עד דור 3 (סבא וסבתא)</option>
                  <option value="4">עד דור 4 (סבא-רבא וסבתא-רבתא)</option>
                  <option value="5">עד דור 5 (בני נינים / 5 דורות)</option>
                  <option value="6">עד דור 6 (6 דורות)</option>
                  <option value="8">עד דור 8 (8 דורות)</option>
                  <option value="10">עד דור 10 (10 דורות)</option>
                  <option value="15">עד דור 15 (15 דורות)</option>
                  <option value="20">עד דור 20 (20 דורות)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {branches.map((b) => {
                const isChecked = selectedBranchIds.includes(b.id);
                const count = deceased.filter((d) => d.branch_id === b.id).length;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBranch(b.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-right transition cursor-pointer ${
                      isChecked
                        ? 'bg-blue-50/60 border-blue-300 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.color || '#2563eb' }}
                          />
                          <span className="text-xs font-bold text-slate-800">
                            {b.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {count} נפטרים
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              לפי הבחירה הנוכחית: <strong className="text-slate-800">{selectedDeceasedCount}</strong> נפטרים מהעץ ייכללו ביומן המשותף.
            </p>
          </div>

          {/* Step 2: Permission Level Selector for Link */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              2. בחר סוג הרשאה למקבלי הקישור:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShareRole('member')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  shareRole === 'member'
                    ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/50 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Eye className={`w-4 h-4 mt-0.5 shrink-0 ${shareRole === 'member' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-900">צפייה בלבד</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                    צפייה ביומן ובאילן היוחסין + סנכרון ליומן Google אישי (ללא עריכה)
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShareRole('editor')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  shareRole === 'editor'
                    ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400/50 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Edit3 className={`w-4 h-4 mt-0.5 shrink-0 ${shareRole === 'editor' ? 'text-amber-700' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-900">הרשאת עריכה מלאה</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                    מאפשר להוסיף ולערוך שמות ותאריכים — כל שינוי יתעדכן אצל כולם
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 3: Sharing Channels */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              3. שתף קישור או חבר ליומן Google:
            </label>

            {/* WhatsApp Quick Share Button */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-sm shadow-md transition transform hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>
                שתף בוואטסאפ ({shareRole === 'editor' ? 'קישור עריכה' : 'קישור צפייה'})
              </span>
            </button>

            {/* Web Link Input & Copy */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                קישור ישיר ({shareRole === 'editor' ? 'מעניק הרשאת עריכה למתחברים' : 'צפייה בלבד'}):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webShareUrl}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-mono truncate select-all"
                />
                <button
                  onClick={() => handleCopy(webShareUrl, 'web')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                    copiedWebLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-blue-700'
                  }`}
                >
                  {copiedWebLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק קישור</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Direct Google Calendar Sync for Selected Branches */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <CalendarIcon className="w-4 h-4 text-amber-700" />
                  <span>סנכרון ישיר ליומן גוגל (מתעדכן אוטומטית בכל שינוי)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={directGoogleAddUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>הוסף בלחיצה אחת ל-Google Calendar</span>
                </a>

                <button
                  onClick={() => handleCopy(httpsSyncUrl, 'sync')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer"
                >
                  {copiedSyncLink ? 'הועתק!' : 'העתק URL ליומן'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 4: Admin Member Management Section */}
          {isAdmin && onManageMember && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-extrabold text-slate-900">
                    4. ניהול הרשאות משתמשים לפי כתובת אימייל (Google)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  למנהל היומן בלבד
                </span>
              </div>

              {/* Add / Update Member by Email Form */}
              <form onSubmit={handleAddOrUpdateMember} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    required
                    placeholder="כתובת אימייל (למשל user@gmail.com)"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="שם מלא (אופציונלי)"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">הרשאה:</span>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as 'member' | 'editor')}
                      className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="editor">✏️ הרשאת עריכה והוספה</option>
                      <option value="member">👁️ צפייה בלבד</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={savingMember}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{savingMember ? 'שומר...' : 'הוסף / עדכן הרשאה'}</span>
                  </button>
                </div>

                {memberMessage && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    {memberMessage}
                  </p>
                )}
              </form>

              {/* Current Members & Pending Branch Requests List */}
              {members.length > 0 && (
                <div className="space-y-3">
                  {/* Pending Requests Section */}
                  {members.some((m) => (m.selected_branch_ids || []).includes('status:pending')) && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5">
                      <span className="block text-xs font-extrabold text-amber-950">
                        🔔 בקשות הצטרפות לענף הממתינות לאישורך:
                      </span>
                      <div className="space-y-2">
                        {members
                          .filter((m) => (m.selected_branch_ids || []).includes('status:pending'))
                          .map((m) => {
                            const tags = m.selected_branch_ids || [];
                            const noteTag = tags.find((t) => t.startsWith('reqNote:'));
                            const noteText = noteTag ? noteTag.replace('reqNote:', '') : '';
                            const reqRoleTag = tags.find((t) => t.startsWith('reqRole:'));
                            const reqRole =
                              reqRoleTag?.replace('reqRole:', '') === 'editor' ? 'editor' : 'member';
                            const subBranchTag = tags.find(
                              (t) => t.startsWith('gen2:') || t.startsWith('gen3:') || t.startsWith('gen4:')
                            );
                            const subBranchLabel = subBranchTag
                              ? branchHierarchy.allNodesById[subBranchTag]?.label ||
                                subBranchTag.split(':').pop()
                              : null;
                            const requestedBranchNames = branches
                              .filter((b) => tags.includes(b.id))
                              .map((b) => b.name);

                            return (
                              <div
                                key={m.id || m.user_email}
                                className="p-3 rounded-xl bg-white border border-amber-200 space-y-2 text-xs shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-slate-900 block">
                                      {m.user_name} ({m.user_email})
                                    </span>
                                    <span className="text-[11px] text-indigo-800 font-semibold block mt-0.5">
                                      מבקש להצטרף ל:{' '}
                                      {requestedBranchNames.length > 0
                                        ? requestedBranchNames.join(' • ')
                                        : 'כל הענפים'}
                                      {subBranchLabel ? ` (${subBranchLabel})` : ''}
                                    </span>
                                    {noteText && (
                                      <span className="text-[11px] text-slate-600 italic block mt-0.5">
                                        ״{noteText}״
                                      </span>
                                    )}
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold shrink-0">
                                    ביקש: {reqRole === 'editor' ? 'עריכה' : 'צפייה'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onManageMember(
                                        m.user_email,
                                        m.user_name,
                                        'member',
                                        tags.filter((t) => t !== 'status:pending')
                                      )
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                                  >
                                    ✓ אשר (צפייה בלבד)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onManageMember(
                                        m.user_email,
                                        m.user_name,
                                        'editor',
                                        tags.filter((t) => t !== 'status:pending')
                                      )
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition cursor-pointer"
                                  >
                                    ✏️ אשר (עם עריכה)
                                  </button>
                                  {onRemoveMember && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveMember(m.user_email)}
                                      className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition cursor-pointer"
                                    >
                                      דחה
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <span className="block text-[11px] font-bold text-slate-600">
                    משתמשים מאושרים ביומן (
                    {members.filter((m) => !(m.selected_branch_ids || []).includes('status:pending')).length}
                    ):
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {members
                      .filter((m) => !(m.selected_branch_ids || []).includes('status:pending'))
                      .map((m) => {
                        const isOwnerMember =
                          m.user_email === calendar.created_by_user_id || m.role === 'admin';
                        const memberBranches = branches
                          .filter((b) => (m.selected_branch_ids || []).includes(b.id))
                          .map((b) => b.name);
                        return (
                          <div
                            key={m.id || m.user_email}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate">
                                {m.user_name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {m.user_email}
                                {memberBranches.length > 0 && memberBranches.length < branches.length
                                  ? ` • ענפים: ${memberBranches.join(', ')}`
                                  : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isOwnerMember ? (
                                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                  מנהל ראשי
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={m.role}
                                    onChange={(e) =>
                                      onManageMember(
                                        m.user_email,
                                        m.user_name,
                                        e.target.value as 'member' | 'editor',
                                        m.selected_branch_ids || selectedBranchIds
                                      )
                                    }
                                    className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer outline-none ${
                                      m.role === 'editor'
                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <option value="editor">✏️ עריכה</option>
                                    <option value="member">👁️ צפייה בלבד</option>
                                  </select>

                                  {onRemoveMember && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveMember(m.user_email)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                      title="הסר משתמש מהיומן"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Privacy & Isolation Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              פרטיות ובקרה מלאה: ניתן לשנות הרשאת משתמש מצפייה לעריכה או להסיר גישה בכל עת.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
