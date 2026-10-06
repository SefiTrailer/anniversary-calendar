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
  MapPin,
  Settings2,
} from 'lucide-react';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from '@/lib/types';
import {
  extractBranchHierarchy,
  matchesBranchHierarchyFilter,
  getGenerationRelationInfo,
  formatCalendarDisplayName,
  extractUserTreePosition,
  formatUserTreePositionLabel,
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
  initialTab?: 'share' | 'members';
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
  initialTab = 'share',
  onManageMember,
  onRemoveMember,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'members'>(initialTab);
  // By default, select all branches
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() =>
    branches.map((b) => b.id)
  );
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [maxGen, setMaxGen] = useState<string>('all');
  const [skippedGens, setSkippedGens] = useState<number[]>([]);
  const [customCalName, setCustomCalName] = useState<string>('');
  const [shareRole, setShareRole] = useState<'member' | 'editor'>('member');
  const [copiedWebLink, setCopiedWebLink] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);
  const [copiedSimchaSyncLink, setCopiedSimchaSyncLink] = useState(false);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'editor'>('editor');
  const [inviteBranchIds, setInviteBranchIds] = useState<string[]>(() => branches.map((b) => b.id));
  const [inviteSubBranch, setInviteSubBranch] = useState<string>('all');
  const [inviteMaxGen, setInviteMaxGen] = useState<string>('all');
  const [savingMember, setSavingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);

  // Inline member branch permission editor state (for already-approved or pending members)
  const [editingMemberEmail, setEditingMemberEmail] = useState<string | null>(null);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editSubBranch, setEditSubBranch] = useState<string>('all');
  const [editMaxGen, setEditMaxGen] = useState<string>('all');
  const [editRole, setEditRole] = useState<'member' | 'editor'>('member');
  const [savingEditEmail, setSavingEditEmail] = useState<string | null>(null);
  const [savedMemberEmail, setSavedMemberEmail] = useState<string | null>(null);

  const branchHierarchy = useMemo(
    () => extractBranchHierarchy(deceased, branches),
    [deceased, branches]
  );

  // Sync selected branches when branches change
  React.useEffect(() => {
    if (branches.length > 0) {
      setSelectedBranchIds(branches.map((b) => b.id));
      setInviteBranchIds(branches.map((b) => b.id));
    }
  }, [branches]);

  React.useEffect(() => {
    if (calendar?.name) {
      setCustomCalName(formatCalendarDisplayName(calendar.name));
    }
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [calendar?.name, isOpen, initialTab]);

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

  const toggleSkipGen = (gen: number) => {
    setSkippedGens((prev) =>
      prev.includes(gen) ? prev.filter((g) => g !== gen) : [...prev, gen]
    );
  };

  const selectAll = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
    setSelectedSubBranch('all');
    setSkippedGens([]);
  };
  const isAllSelected =
    selectedBranchIds.length === branches.length &&
    selectedSubBranch === 'all' &&
    skippedGens.length === 0;
  const isPartialSelected = !isAllSelected;

  // Compute deceased count matching selected branches, subBranch, maxGen, and skippedGens
  const selectedDeceasedCount = deceased.filter((d) => {
    if (!selectedBranchIds.includes(d.branch_id)) return false;
    if (selectedSubBranch !== 'all' && !matchesBranchHierarchyFilter(d, selectedSubBranch, branches)) return false;
    const relGen = getGenerationRelationInfo(d, 1).relativeGeneration;
    if (maxGen !== 'all' && relGen > Number(maxGen)) return false;
    if (skippedGens.includes(relGen) || (relGen >= 8 && skippedGens.includes(8))) return false;
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
  const skipGensParam = skippedGens.length > 0 ? `&skipGens=${encodeURIComponent(skippedGens.join(','))}` : '';
  const webShareUrl = `${origin}/?share=true&calendarId=${calendar.id}&branches=${branchParam}${subBranchParam}${maxGenParam}${skipGensParam}${roleParam}`;

  // Generate iCal / WebCal sync links for Memorials and Simchas
  const protocol = origin.startsWith('https') ? 'webcal:' : 'http:';
  const cleanHost = origin.replace(/^https?:\/\//, '');
  const effectiveToken = feedToken && feedToken !== 'shared' ? feedToken : calendar.id;

  const buildSyncUrls = (feedType: 'memorials' | 'simchas') => {
    const syncQuery = new URLSearchParams({ v: '5', type: feedType });
    if (!isAllSelected && selectedBranchIds.length > 0) syncQuery.set('branches', branchParam);
    if (selectedSubBranch !== 'all') syncQuery.set('subBranch', selectedSubBranch);
    if (maxGen !== 'all') syncQuery.set('maxGen', maxGen);
    if (skippedGens.length > 0) syncQuery.set('skipGens', skippedGens.join(','));
    if (feedType === 'memorials' && effectiveCalName !== defaultDisplayName) {
      syncQuery.set('calName', effectiveCalName);
    }
    const qs = syncQuery.toString();
    const webcal = `${protocol}//${cleanHost}/api/calendar/${effectiveToken}.ics?${qs}`;
    const https = `${origin}/api/calendar/${effectiveToken}.ics?${qs}`;
    const googleSub = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
    return { webcal, https, googleSub };
  };

  const memorialsSync = buildSyncUrls('memorials');
  const simchasSync = buildSyncUrls('simchas');

  // Copy helper
  const handleCopy = async (text: string, type: 'web' | 'sync' | 'simcha') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'web') {
        setCopiedWebLink(true);
        setTimeout(() => setCopiedWebLink(false), 2500);
      } else if (type === 'simcha') {
        setCopiedSimchaSyncLink(true);
        setTimeout(() => setCopiedSimchaSyncLink(false), 2500);
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
    const text = `שלום! מצורף קישור ללוח השנה המשפחתי (ימי זיכרון, ימי הולדת ושמחות) עבור *${effectiveCalName}* (ענף: ${branchLabel}${genLabel} • ${roleLabel}):\n\n${webShareUrl}\n\nהקישור מאפשר לסנן לפי דורות ולהוסיף ליומן Google שני יומנים נפרדים (יומן ימי זיכרון + יומן שמחות בצבע שונה!).`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const toggleInviteBranch = (id: string) => {
    setInviteBranchIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((bId) => bId !== id);
      }
      return [...prev, id];
    });
  };

  const toggleEditBranch = (id: string) => {
    setEditBranchIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((bId) => bId !== id);
      }
      return [...prev, id];
    });
  };

  const startEditMember = (m: UserMembership) => {
    if (editingMemberEmail === m.user_email) {
      setEditingMemberEmail(null);
      return;
    }
    const tags = m.selected_branch_ids || [];
    const validBranchUuidSet = new Set(branches.map((b) => b.id));
    const currentMemberBranchUuids = tags.filter((t) => validBranchUuidSet.has(t));
    setEditBranchIds(
      currentMemberBranchUuids.length > 0 ? currentMemberBranchUuids : branches.map((b) => b.id)
    );
    const subTag = tags.find(
      (t) => t.startsWith('gen2:') || t.startsWith('gen3:') || t.startsWith('gen4:')
    );
    setEditSubBranch(subTag || 'all');
    const maxGenTag = tags.find((t) => t.startsWith('maxGen:'));
    setEditMaxGen(maxGenTag ? maxGenTag.replace('maxGen:', '') : 'all');
    const reqRoleTag = tags.find((t) => t.startsWith('reqRole:'));
    const defaultRole =
      m.role === 'editor' || reqRoleTag === 'reqRole:editor' ? 'editor' : 'member';
    setEditRole(defaultRole);
    setEditingMemberEmail(m.user_email);
  };

  const handleSaveMemberBranchPermissions = async (
    m: UserMembership,
    overrideRole?: 'member' | 'editor'
  ) => {
    if (!onManageMember) return;
    setSavingEditEmail(m.user_email);
    try {
      const validBranchUuidSet = new Set(branches.map((b) => b.id));
      const existingTags = m.selected_branch_ids || [];
      // Preserve metadata tags such as targetCal:, userGen:, treeRelation:, treeAnchorId:, treeAnchorName:, reqNote:
      const preservedMetaTags = existingTags.filter(
        (t) =>
          !validBranchUuidSet.has(t) &&
          t !== 'status:pending' &&
          !t.startsWith('reqRole:') &&
          !t.startsWith('maxGen:') &&
          !t.startsWith('gen2:') &&
          !t.startsWith('gen3:') &&
          !t.startsWith('gen4:')
      );

      const finalBranchIds = [
        ...(editBranchIds.length > 0 ? editBranchIds : branches.map((b) => b.id)),
        ...(editSubBranch !== 'all' ? [editSubBranch] : []),
        ...(editMaxGen !== 'all' ? [`maxGen:${editMaxGen}`] : []),
        ...preservedMetaTags,
      ];

      await onManageMember(
        m.user_email,
        m.user_name,
        overrideRole || editRole,
        finalBranchIds
      );
      setEditingMemberEmail(null);
      setSavedMemberEmail(m.user_email);
      setTimeout(() => setSavedMemberEmail(null), 3000);
    } catch (err) {
      console.error('Failed to update member branch permissions:', err);
    } finally {
      setSavingEditEmail(null);
    }
  };

  const handleAddOrUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onManageMember || !newMemberEmail.trim()) return;
    setSavingMember(true);
    setMemberMessage(null);
    try {
      const payloadBranches = [
        ...(inviteBranchIds.length > 0 ? inviteBranchIds : branches.map((b) => b.id)),
      ];
      if (inviteSubBranch !== 'all') payloadBranches.push(inviteSubBranch);
      if (inviteMaxGen !== 'all') payloadBranches.push(`maxGen:${inviteMaxGen}`);

      await onManageMember(
        newMemberEmail.trim().toLowerCase(),
        newMemberName.trim() || newMemberEmail.trim().split('@')[0],
        newMemberRole,
        payloadBranches
      );
      setNewMemberEmail('');
      setNewMemberName('');
      setMemberMessage('הרשאת המשתמש והענפים נשמרו ועודכנו בהצלחה!');
      setTimeout(() => setMemberMessage(null), 3500);
    } catch (err: any) {
      setMemberMessage(err.message || 'שגיאה בעדכון הרשאות');
    } finally {
      setSavingMember(false);
    }
  };

  const pendingMembers = members.filter((m) =>
    (m.selected_branch_ids || []).includes('status:pending')
  );
  const approvedMembers = members.filter(
    (m) => !(m.selected_branch_ids || []).includes('status:pending')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[92vh] overflow-y-auto relative text-right">
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 sticky top-0 z-10" />

        {/* Modal Header */}
        <div className="p-6 pb-3 flex items-start justify-between border-b border-slate-100 sticky top-2 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
              {activeTab === 'members' ? <Users className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                שיתוף יומן, חברים ובקשות הצטרפות
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

        {/* Top Tab Switcher */}
        <div className="px-6 pt-3 pb-1 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2.5 px-3 rounded-t-xl text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'share'
                ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>שיתוף וקישורי סנכרון</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2.5 px-3 rounded-t-xl text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>חברים ובקשות הצטרפות ({members.length})</span>
            {pendingMembers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {pendingMembers.length} ממתינות
              </span>
            )}
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'share' ? (
            <>
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
                      <option value="2">עד דור 2 בלבד (הורים, אחים וילדים)</option>
                      <option value="3">עד דור 3 (סבא וסבתא)</option>
                      <option value="4">עד דור 4 (סבא-רבא וסבתא-רבתא)</option>
                      <option value="5">עד דור 5 (בני נינים / מוותר על 6-7+)</option>
                      <option value="6">עד דור 6 (מוותר על דור 7+)</option>
                      <option value="7">עד דור 7</option>
                      <option value="8">עד דור 8</option>
                      <option value="10">עד דור 10</option>
                    </select>
                  </div>
                </div>

                {/* Specific Generation Skipping Chips */}
                <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      ויתור / סינון דורות ספציפיים (לחץ כדי להסיר דור שלא רלוונטי עבורך):
                    </span>
                    {skippedGens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSkippedGens([])}
                        className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        החזר כל הדורות
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { gen: 1, label: 'דור 1' },
                      { gen: 2, label: 'דור 2 (הורים)' },
                      { gen: 3, label: 'דור 3 (סבים)' },
                      { gen: 4, label: 'דור 4 (סבא-רבא)' },
                      { gen: 5, label: 'דור 5' },
                      { gen: 6, label: 'דור 6' },
                      { gen: 7, label: 'דור 7' },
                      { gen: 8, label: 'דור 8+' },
                    ].map((chip) => {
                      const isExceeded = maxGen !== 'all' && chip.gen > Number(maxGen);
                      const isSkipped = skippedGens.includes(chip.gen) || isExceeded;
                      return (
                        <button
                          key={chip.gen}
                          type="button"
                          disabled={isExceeded}
                          onClick={() => toggleSkipGen(chip.gen)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            isSkipped
                              ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                              : 'bg-white text-blue-900 border-blue-300 shadow-2xs hover:bg-blue-50'
                          }`}
                        >
                          {isSkipped ? '✕ ' : '✓ '}
                          {chip.label}
                        </button>
                      );
                    })}
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
                              {count} רשומות בענף
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  לפי הבחירה הנוכחית: <strong className="text-slate-800">{selectedDeceasedCount}</strong> רשומות מהעץ ייכללו בלוח המשותף.
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
                        צפייה בלוח ובאילן היוחסין + סנכרון ליומן Google אישי (ללא עריכה)
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
                  3. שתף קישור או חבר ליומן Google (בשני יומנים בצבעים שונים):
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
                    קישור ישיר ללוח המשפחתי ({shareRole === 'editor' ? 'מעניק הרשאת עריכה למתחברים' : 'צפייה בלבד'}):
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

                {/* Direct Google Calendar Sync — 2 Separate Calendars for 2 Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Calendar 1: Memorials */}
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs">
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>🕯️ יומן 1: ימי זיכרון (צאת הכוכבים–שקיעה)</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={memorialsSync.googleSub}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>הוסף יומן ימי זיכרון ל-Google</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(memorialsSync.https, 'sync')}
                        className="w-full px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-slate-700 rounded-xl font-bold text-[11px] transition cursor-pointer"
                      >
                        {copiedSyncLink ? 'קישור הועתק!' : 'העתק URL יומן זיכרון'}
                      </button>
                    </div>
                  </div>

                  {/* Calendar 2: Simchas */}
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-xs">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>🎂💍 יומן 2: ימי הולדת ושמחות (בצבע נפרד)</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href={simchasSync.googleSub}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>הוסף יומן שמחות ל-Google</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(simchasSync.https, 'simcha')}
                        className="w-full px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-slate-700 rounded-xl font-bold text-[11px] transition cursor-pointer"
                      >
                        {copiedSimchaSyncLink ? 'קישור הועתק!' : 'העתק URL יומן שמחות'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Switch to Members Tab */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-indigo-950">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    כרגע רשומים ביומן <strong>{approvedMembers.length}</strong> חברים
                    {pendingMembers.length > 0 ? ` ויש ${pendingMembers.length} בקשות הצטרפות הממתינות לאישור` : ''}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  צפה בחברים ובבקשות &larr;
                </button>
              </div>
            </>
          ) : (
            /* TAB 2: MEMBERS & JOIN REQUESTS */
            <div className="space-y-5">
              {/* 1. Pending Join Requests Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>🔔 בקשות הצטרפות לענף הממתינות לאישורך</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      pendingMembers.length > 0
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {pendingMembers.length}
                    </span>
                  </span>
                </div>

                {pendingMembers.length > 0 ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5">
                    <div className="space-y-2">
                      {pendingMembers.map((m) => {
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
                        const maxGenTag = tags.find((t) => t.startsWith('maxGen:'));
                        const maxGenVal = maxGenTag ? maxGenTag.replace('maxGen:', '') : null;
                        const targetCalTag = tags.find((t) => t.startsWith('targetCal:'));
                        const requestedBranchNames = branches
                          .filter((b) => tags.includes(b.id))
                          .map((b) => b.name);
                        const treePos = extractUserTreePosition(tags, m.user_generation);
                        const hasCustomTreePos =
                          tags.some((t) => t.startsWith('treeRelation:') || t.startsWith('userGen:')) ||
                          Boolean(m.tree_relation || m.tree_person_name);
                        const isEditingThis = editingMemberEmail === m.user_email;

                        return (
                          <div
                            key={m.id || m.user_email}
                            className="p-3 rounded-xl bg-white border border-amber-200 space-y-2.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block">
                                  {m.user_name} ({m.user_email})
                                </span>
                                <span className="text-[11px] text-indigo-800 font-semibold block">
                                  מבקש להצטרף ל:{' '}
                                  {requestedBranchNames.length > 0
                                    ? requestedBranchNames.join(' • ')
                                    : 'כל הענפים'}
                                  {subBranchLabel ? ` (${subBranchLabel})` : ''}
                                  {maxGenVal ? ` • עד דור ${maxGenVal}` : ''}
                                </span>
                                {hasCustomTreePos && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold mt-0.5">
                                    <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span>
                                      מיקום בעץ: {formatUserTreePositionLabel(treePos, calendar.created_by_user_name)}
                                    </span>
                                  </span>
                                )}
                                {targetCalTag && (
                                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                                    🔗 ביקש למזג את הענף לתוך היומן האישי שלו
                                  </span>
                                )}
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

                            {isEditingThis && (
                              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                                <span className="text-[11px] font-extrabold text-indigo-950 block">
                                  🌿 התאם אילו ענפים ותתי-ענפים לאשר עבור {m.user_name}:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {branches.map((b) => {
                                    const checked = editBranchIds.includes(b.id);
                                    return (
                                      <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => toggleEditBranch(b.id)}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                                          checked
                                            ? 'bg-white border-indigo-500 text-indigo-950 shadow-2xs'
                                            : 'bg-white/60 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        <span className="flex items-center gap-1.5 truncate">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: b.color || '#2563eb' }}
                                          />
                                          <span className="truncate">{b.name}</span>
                                        </span>
                                        <span>{checked ? '✓' : ''}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <select
                                    value={editSubBranch}
                                    onChange={(e) => setEditSubBranch(e.target.value)}
                                    className="text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 outline-none cursor-pointer"
                                  >
                                    <option value="all">כל תתי-הענפים בענפים שנבחרו</option>
                                    {branchHierarchy.mainBranches.map((mb) => (
                                      <option key={mb.id} value={mb.id}>
                                        דור 2: {mb.shortLabel}
                                      </option>
                                    ))}
                                    {branchHierarchy.grandparentBranches.map((gp) => (
                                      <option key={gp.id} value={gp.id}>
                                        דור 3: {gp.shortLabel}
                                      </option>
                                    ))}
                                    {branchHierarchy.greatGrandparentBranches.map((ggp) => (
                                      <option key={ggp.id} value={ggp.id}>
                                        דור 4: {ggp.shortLabel}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={editMaxGen}
                                    onChange={(e) => setEditMaxGen(e.target.value)}
                                    className="text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 outline-none cursor-pointer"
                                  >
                                    <option value="all">כל הדורות בענף</option>
                                    <option value="2">עד דור 2</option>
                                    <option value="3">עד דור 3</option>
                                    <option value="4">עד דור 4</option>
                                    <option value="5">עד דור 5</option>
                                    <option value="6">עד דור 6</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {isAdmin && onManageMember && (
                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => startEditMember(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                                >
                                  <Settings2 className="w-3.5 h-3.5" />
                                  <span>{isEditingThis ? 'סגור בחירת ענפים' : 'התאם ענפים'}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={savingEditEmail === m.user_email}
                                    onClick={() =>
                                      isEditingThis
                                        ? handleSaveMemberBranchPermissions(m, 'member')
                                        : onManageMember(
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
                                    disabled={savingEditEmail === m.user_email}
                                    onClick={() =>
                                      isEditingThis
                                        ? handleSaveMemberBranchPermissions(m, 'editor')
                                        : onManageMember(
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    כרגע אין בקשות הצטרפות הממתינות לאישור. כשבן משפחה יבקש להצטרף ליומן או לענף שלך (דרך כפתור <strong>״בקש להצטרף לענף קיים״</strong>), הבקשה תופיע כאן מיד וגם כבאנר בולט בראש היומן.
                  </div>
                )}
              </div>

              {/* 2. Approved Members List */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    ✅ משתמשים ובני משפחה המחוברים ליומן ({approvedMembers.length}):
                  </span>
                  {isAdmin && approvedMembers.length > 1 && (
                    <span className="text-[10px] font-bold text-indigo-700">
                      ניתן לעדכן הרשאות גישה לענפים לכל משתמש בכל עת
                    </span>
                  )}
                </div>

                {approvedMembers.length > 0 ? (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {approvedMembers.map((m) => {
                      const isOwnerMember =
                        m.user_email === calendar.created_by_user_id || m.role === 'admin';
                      const tags = m.selected_branch_ids || [];
                      const memberBranches = branches
                        .filter((b) => tags.includes(b.id))
                        .map((b) => b.name);
                      const subBranchTag = tags.find(
                        (t) => t.startsWith('gen2:') || t.startsWith('gen3:') || t.startsWith('gen4:')
                      );
                      const subBranchLabel = subBranchTag
                        ? branchHierarchy.allNodesById[subBranchTag]?.shortLabel ||
                          subBranchTag.split(':').pop()
                        : null;
                      const maxGenTag = tags.find((t) => t.startsWith('maxGen:'));
                      const maxGenVal = maxGenTag ? maxGenTag.replace('maxGen:', '') : null;
                      const isMergedToPersonalCal = tags.some((t) => t.startsWith('targetCal:'));
                      const treePos = extractUserTreePosition(tags, m.user_generation);
                      const hasCustomTreePos =
                        tags.some((t) => t.startsWith('treeRelation:') || t.startsWith('userGen:')) ||
                        Boolean(m.tree_relation || m.tree_person_name);
                      const isEditingThis = editingMemberEmail === m.user_email;
                      const isSavedThis = savedMemberEmail === m.user_email;

                      return (
                        <div
                          key={m.id || m.user_email}
                          className={`p-3 rounded-xl bg-white border transition text-xs shadow-2xs space-y-2.5 ${
                            isEditingThis
                              ? 'border-indigo-400 ring-1 ring-indigo-400/30'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 truncate">
                                  {m.user_name}
                                </span>
                                {isOwnerMember && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                    בעל היומן
                                  </span>
                                )}
                                {isMergedToPersonalCal && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                    🔗 משולב גם ביומן האישי
                                  </span>
                                )}
                                {isSavedThis && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                                    ✓ הרשאות הענפים עודכנו!
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {m.user_email}
                              </span>
                              {!isOwnerMember && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-indigo-800 bg-indigo-50/80 border border-indigo-200/80 px-2 py-0.5 rounded-md font-bold">
                                    🌿 ענפים:{' '}
                                    {memberBranches.length > 0 && memberBranches.length < branches.length
                                      ? memberBranches.join(' • ')
                                      : 'כל הענפים'}
                                    {subBranchLabel ? ` (${subBranchLabel})` : ''}
                                    {maxGenVal ? ` • עד דור ${maxGenVal}` : ''}
                                  </span>
                                  {hasCustomTreePos && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                                      <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span>
                                        {formatUserTreePositionLabel(treePos, calendar.created_by_user_name)}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {isOwnerMember ? (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  מנהל ראשי
                                </span>
                              ) : isAdmin && onManageMember ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditMember(m)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                      isEditingThis
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                                    }`}
                                    title="עדכן הרשאות גישה לענפים ותתי-ענפים עבור משתמש זה"
                                  >
                                    <GitBranch className="w-3 h-3" />
                                    <span>{isEditingThis ? 'סגור עריכת ענפים' : 'עדכן ענפים'}</span>
                                  </button>

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
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                  {m.role === 'editor' ? '✏️ עריכה' : '👁️ צפייה בלבד'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expandable Inline Branch & Permission Editor for Approved Member */}
                          {isEditingThis && isAdmin && onManageMember && (
                            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1.5">
                                  <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>עדכון הרשאות גישה לענפים עבור {m.user_name}:</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBranchIds(branches.map((b) => b.id));
                                    setEditSubBranch('all');
                                    setEditMaxGen('all');
                                  }}
                                  className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                                >
                                  אפשר את כל הענפים והדורות
                                </button>
                              </div>

                              {/* Branch Checkboxes */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {branches.map((b) => {
                                  const checked = editBranchIds.includes(b.id);
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => toggleEditBranch(b.id)}
                                      className={`flex items-center justify-between p-2 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                                        checked
                                          ? 'bg-white border-indigo-500 text-indigo-950 shadow-2xs'
                                          : 'bg-white/60 border-slate-200 text-slate-500'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: b.color || '#2563eb' }}
                                        />
                                        <span className="truncate">{b.name}</span>
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
                                        {checked ? 'גישה ✓' : 'ללא גישה'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Sub-Branch & Max Generation Selectors */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    הגבלה לתת-ענף ספציפי:
                                  </label>
                                  <select
                                    value={editSubBranch}
                                    onChange={(e) => setEditSubBranch(e.target.value)}
                                    className="w-full text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 outline-none cursor-pointer"
                                  >
                                    <option value="all">כל תתי-הענפים בענפים שנבחרו</option>
                                    {branchHierarchy.mainBranches.length > 0 && (
                                      <optgroup label="── ענף מרכזי (דור 2) ──">
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
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    טווח דורות מורשה:
                                  </label>
                                  <select
                                    value={editMaxGen}
                                    onChange={(e) => setEditMaxGen(e.target.value)}
                                    className="w-full text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 outline-none cursor-pointer"
                                  >
                                    <option value="all">כל הדורות בענף (ללא הגבלה)</option>
                                    <option value="2">עד דור 2 בלבד</option>
                                    <option value="3">עד דור 3 (סבים וסבתות)</option>
                                    <option value="4">עד דור 4 (סבא-רבא)</option>
                                    <option value="5">עד דור 5</option>
                                    <option value="6">עד דור 6</option>
                                    <option value="7">עד דור 7</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-200/60">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-700">סוג הרשאה:</span>
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value as 'member' | 'editor')}
                                    className="text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 outline-none cursor-pointer"
                                  >
                                    <option value="member">👁️ צפייה בלבד</option>
                                    <option value="editor">✏️ הרשאת עריכה</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMemberEmail(null)}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 cursor-pointer"
                                  >
                                    ביטול
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingEditEmail === m.user_email}
                                    onClick={() => handleSaveMemberBranchPermissions(m)}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                                  >
                                    {savingEditEmail === m.user_email ? 'שומר...' : 'שמור הרשאות ענפים'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    עדיין לא הצטרפו חברים נוספים ליומן זה.
                  </div>
                )}
              </div>

              {/* 3. Add / Invite Member by Email (Admin only) */}
              {isAdmin && onManageMember && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-extrabold text-slate-900">
                        הוספת בן משפחה או עדכון הרשאה לפי אימייל (Google)
                      </h3>
                    </div>
                  </div>

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

                    {/* Branch Selection for Email Invite / Update */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        בחר לאילו ענפים להעניק גישה:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {branches.map((b) => {
                          const checked = inviteBranchIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => toggleInviteBranch(b.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                                checked
                                  ? 'bg-white border-indigo-500 text-indigo-950 shadow-2xs'
                                  : 'bg-white/60 border-slate-200 text-slate-500'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: b.color || '#2563eb' }}
                                />
                                <span className="truncate">{b.name}</span>
                              </span>
                              <span>{checked ? 'נבחר ✓' : 'בחר'}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <select
                          value={inviteSubBranch}
                          onChange={(e) => setInviteSubBranch(e.target.value)}
                          className="text-[11px] font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="all">כל תתי-הענפים בענפים שנבחרו</option>
                          {branchHierarchy.mainBranches.map((mb) => (
                            <option key={mb.id} value={mb.id}>
                              דור 2: {mb.shortLabel}
                            </option>
                          ))}
                          {branchHierarchy.grandparentBranches.map((gp) => (
                            <option key={gp.id} value={gp.id}>
                              דור 3: {gp.shortLabel}
                            </option>
                          ))}
                          {branchHierarchy.greatGrandparentBranches.map((ggp) => (
                            <option key={ggp.id} value={ggp.id}>
                              דור 4: {ggp.shortLabel}
                            </option>
                          ))}
                        </select>

                        <select
                          value={inviteMaxGen}
                          onChange={(e) => setInviteMaxGen(e.target.value)}
                          className="text-[11px] font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="all">כל הדורות בענף</option>
                          <option value="3">עד דור 3</option>
                          <option value="4">עד דור 4</option>
                          <option value="5">עד דור 5</option>
                          <option value="6">עד דור 6</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
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
                </div>
              )}
            </div>
          )}

          {/* Privacy & Isolation Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              פרטיות ובקרה מלאה: ניתן לעדכן הרשאות גישה לענפים, לשנות מצפייה לעריכה או להסיר גישה בכל עת.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
