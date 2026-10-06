'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CalendarProject } from '@/lib/types';
import {
  formatCalendarDisplayName,
  TREE_RELATION_OPTIONS,
  TreeRelationType,
  calculateUserGenFromAnchor,
} from '@/lib/hebrew-calendar';
import {
  X,
  GitBranch,
  Layers,
  Search,
  CheckCircle2,
  Send,
  Link2,
  Eye,
  Edit3,
  Sparkles,
  Users,
  MapPin,
} from 'lucide-react';

interface DirectoryCalendar {
  id: string;
  name: string;
  description?: string;
  created_by_user_name: string;
  created_by_user_id: string;
  branches: Array<{ id: string; name: string; color: string }>;
  subBranches: {
    mainBranches: Array<{ id: string; label: string; count: number }>;
    grandparentBranches: Array<{ id: string; label: string; count: number }>;
    greatGrandparentBranches: Array<{ id: string; label: string; count: number }>;
  };
  people?: Array<{
    id: string;
    name: string;
    generation: number;
    branch_id: string;
    relationship?: string;
  }>;
}

interface JoinBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email: string; name: string } | null;
  userCalendars: CalendarProject[];
  activeCalendarId?: string | null;
  preselectedSourceCalendarId?: string | null;
  preselectedBranchIds?: string[];
  autoApproveIfAlreadyMember?: boolean;
  onSuccess: () => Promise<void>;
}

export const JoinBranchModal: React.FC<JoinBranchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userCalendars,
  activeCalendarId,
  preselectedSourceCalendarId,
  preselectedBranchIds,
  autoApproveIfAlreadyMember = false,
  onSuccess,
}) => {
  const [directory, setDirectory] = useState<DirectoryCalendar[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSourceCalId, setSelectedSourceCalId] = useState<string>('');
  const [selectedBranchUuids, setSelectedBranchUuids] = useState<string[]>([]);
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [maxGenerations, setMaxGenerations] = useState<string>('all');
  const [targetCalendarId, setTargetCalendarId] = useState<string>('');
  const [requestedRole, setRequestedRole] = useState<'member' | 'editor'>('member');
  const [note, setNote] = useState('');

  // Tree position state for the joining user
  const [treeRelation, setTreeRelation] = useState<TreeRelationType>('general');
  const [treeAnchorId, setTreeAnchorId] = useState<string>('');
  const [userGen, setUserGen] = useState<number>(1);
  const [personFilterQuery, setPersonFilterQuery] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'approved' | 'pending' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setResultMessage(null);
    setLoadingDirectory(true);
    fetch('/api/data?directory=true')
      .then((r) => r.json())
      .then((data) => {
        const list: DirectoryCalendar[] = data.directory || [];
        setDirectory(list);

        if (preselectedSourceCalendarId) {
          setSelectedSourceCalId(preselectedSourceCalendarId);
          const found = list.find((c) => c.id === preselectedSourceCalendarId);
          if (found) {
            setSelectedBranchUuids(
              preselectedBranchIds && preselectedBranchIds.length > 0
                ? preselectedBranchIds
                : found.branches.map((b) => b.id)
            );
          }
        } else {
          // Pick first calendar not owned by current user, or first available
          const otherCal =
            list.find(
              (c) =>
                c.id !== activeCalendarId &&
                c.created_by_user_id.toLowerCase() !== (currentUser?.email || '').toLowerCase()
            ) || list.find((c) => c.id !== activeCalendarId) || list[0];

          if (otherCal) {
            setSelectedSourceCalId(otherCal.id);
            setSelectedBranchUuids(otherCal.branches.map((b) => b.id));
          }
        }
      })
      .catch((err) => console.error('Failed to load directory:', err))
      .finally(() => setLoadingDirectory(false));
  }, [isOpen, preselectedSourceCalendarId, activeCalendarId, currentUser?.email]);

  useEffect(() => {
    if (activeCalendarId) {
      setTargetCalendarId(activeCalendarId);
    } else if (userCalendars.length > 0) {
      setTargetCalendarId(userCalendars[0].id);
    } else {
      setTargetCalendarId('all');
    }
  }, [activeCalendarId, userCalendars, isOpen]);

  const filteredDirectory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return directory.filter((cal) => {
      // Don't link a calendar into itself
      if (cal.id === targetCalendarId && directory.length > 1) return false;
      if (!q) return true;
      const matchName = cal.name.toLowerCase().includes(q);
      const matchOwner = (cal.created_by_user_name || '').toLowerCase().includes(q);
      const matchBranch = cal.branches.some((b) => b.name.toLowerCase().includes(q));
      return matchName || matchOwner || matchBranch;
    });
  }, [directory, searchQuery, targetCalendarId]);

  const selectedSourceCal = useMemo(
    () => directory.find((c) => c.id === selectedSourceCalId) || null,
    [directory, selectedSourceCalId]
  );

  const selectedAnchorPerson = useMemo(() => {
    if (!selectedSourceCal?.people || !treeAnchorId) return null;
    return selectedSourceCal.people.find((p) => p.id === treeAnchorId) || null;
  }, [selectedSourceCal, treeAnchorId]);

  const filteredSourcePeople = useMemo(() => {
    const list = selectedSourceCal?.people || [];
    const q = personFilterQuery.trim().toLowerCase();
    return list
      .filter((p) => {
        if (selectedBranchUuids.length > 0 && !selectedBranchUuids.includes(p.branch_id)) {
          return false;
        }
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.relationship || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.generation || 2) - (b.generation || 2));
  }, [selectedSourceCal, selectedBranchUuids, personFilterQuery]);

  const handleSelectSourceCal = (cal: DirectoryCalendar) => {
    setSelectedSourceCalId(cal.id);
    setSelectedBranchUuids(cal.branches.map((b) => b.id));
    setSelectedSubBranch('all');
    setMaxGenerations('all');
    setTreeAnchorId('');
  };

  const handleRelationTypeChange = (rel: TreeRelationType) => {
    setTreeRelation(rel);
    if (rel === 'general') {
      setTreeAnchorId('');
    } else if (selectedAnchorPerson) {
      setUserGen(calculateUserGenFromAnchor(selectedAnchorPerson.generation || 2, rel));
    }
  };

  const handleSelectAnchorPerson = (personId: string) => {
    setTreeAnchorId(personId);
    const p = selectedSourceCal?.people?.find((x) => x.id === personId);
    if (p) {
      const effectiveRel = treeRelation === 'general' ? 'child_of' : treeRelation;
      if (treeRelation === 'general') setTreeRelation('child_of');
      setUserGen(calculateUserGenFromAnchor(p.generation || 2, effectiveRel));
    }
  };

  const toggleBranchUuid = (id: string) => {
    setSelectedBranchUuids((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedSourceCal) return;

    setSubmitting(true);
    setResultMessage(null);

    try {
      const requestedBranchIds = [
        ...selectedBranchUuids,
        ...(selectedSubBranch !== 'all' ? [selectedSubBranch] : []),
        ...(maxGenerations !== 'all' ? [`maxGen:${maxGenerations}`] : []),
        `userGen:${userGen}`,
        ...(treeRelation !== 'general' ? [`treeRelation:${treeRelation}`] : []),
        ...(selectedAnchorPerson ? [`treeAnchorId:${selectedAnchorPerson.id}`] : []),
        ...(selectedAnchorPerson
          ? [`treeAnchorName:${selectedAnchorPerson.name.replace(/:/g, ' ')}`]
          : []),
      ];

      // Save locally as well so the joining user's view immediately reflects their tree position
      try {
        localStorage.setItem('ner_neshama_user_gen', String(userGen));
        localStorage.setItem(
          'ner_neshama_user_tree_position',
          JSON.stringify({
            userGen,
            relationType: treeRelation,
            anchorPersonId: selectedAnchorPerson?.id,
            anchorPersonName: selectedAnchorPerson?.name,
          })
        );
      } catch {}

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_branch_join',
          userEmail: currentUser.email,
          payload: {
            sourceCalendarId: selectedSourceCal.id,
            targetCalendarId: targetCalendarId || 'all',
            requestedBranchIds,
            requestedRole,
            userName: currentUser.name,
            note,
            autoApproveIfAlreadyMember,
            userGeneration: userGen,
            treeRelation,
            treeAnchorId: selectedAnchorPerson?.id,
            treeAnchorName: selectedAnchorPerson?.name,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הבקשה');
      }

      if (data.status === 'approved') {
        setResultMessage({
          type: 'approved',
          text: 'הענף אוחד ושולב בהצלחה לתוך היומן שלך! כל ימי הזיכרון מהענף יופיעו מעתה יחד ביומן המאוחד שלך וב-Google Calendar.',
        });
      } else {
        setResultMessage({
          type: 'pending',
          text: `בקשת ההצטרפות נשלחה אל ${selectedSourceCal.created_by_user_name || 'בעל היומן'}! מיד לאחר אישורו, הענף ישולב אוטומטית בתוך היומן שלך ללא צורך ביומן נפרד.`,
        });
      }

      await onSuccess();
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: err.message || 'שגיאה בשליחת בקשת ההצטרפות',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[92vh] overflow-y-auto relative text-right">
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-amber-500 sticky top-0 z-10" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 sticky top-2 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                בקשת הצטרפות לענף ואיחוד לתוך היומן שלי
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                צרף ענף או תת-ענף של קרוב משפחה ישירות לתוך היומן המאוחד שלך
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-start gap-2.5 text-xs text-indigo-950">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">יומן אחד מאוחד במקום מספר יומנים נפרדים:</span>
              <span className="text-indigo-900 leading-relaxed block">
                אם יש לך עץ משפחה משלך (מצד אחר של המשפחה) ואתה קשור גם לענף ביומן של קרוב משפחה, תוכל לבקש להצטרף רק לענף הרלוונטי אליך ולשלב אותו אוטומטית בתוך היומן האישי שלך.
              </span>
            </div>
          </div>

          {/* Step 1: Select Family Calendar */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              1. בחר את היומן המשפחתי שממנו תרצה לצרף ענף:
            </label>

            {directory.length > 2 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש לפי שם משפחה או שם בעל היומן..."
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {loadingDirectory ? (
              <div className="p-4 text-center text-xs text-slate-500">טוען רשימת יומנים משפחתיים...</div>
            ) : filteredDirectory.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                לא נמצאו יומנים תואמים לחיפוש.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                {filteredDirectory.map((cal) => {
                  const isSelected = cal.id === selectedSourceCalId;
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => handleSelectSourceCal(cal)}
                      className={`p-3 rounded-2xl border text-right transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-1 ring-indigo-500/30'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="font-serif font-black text-sm text-slate-900 block">
                          {formatCalendarDisplayName(cal.name)}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          בעל היומן: <strong>{cal.created_by_user_name || 'מנהל היומן'}</strong> &bull;{' '}
                          {cal.branches.map((b) => b.name).join(' • ')}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Select Specific Branch / Sub-Branch & Generation Depth */}
          {selectedSourceCal && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                2. בחר את הענף, תת-הענף ומספר הדורות שברצונך לצרף:
              </label>

              {/* Branch Checkboxes */}
              {selectedSourceCal.branches.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedSourceCal.branches.map((b) => {
                    const checked = selectedBranchUuids.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBranchUuid(b.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          checked
                            ? 'bg-blue-50/90 border-blue-500 text-blue-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.color }}
                          />
                          <span className="truncate">{b.name}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200">
                          {checked ? 'נבחר ✓' : 'בחר'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sub-branch & Max Generation Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ענף מרכזי / תת-ענף ספציפי:</span>
                  </label>
                  <select
                    value={selectedSubBranch}
                    onChange={(e) => setSelectedSubBranch(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                  >
                    <option value="all">כל הענפים שנבחרו למעלה</option>
                    {selectedSourceCal.subBranches.mainBranches.length > 0 && (
                      <optgroup label="── ענף מרכזי (דור 2) ──">
                        {selectedSourceCal.subBranches.mainBranches.map((mb) => (
                          <option key={mb.id} value={mb.id}>
                            {mb.label} ({mb.count})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {selectedSourceCal.subBranches.grandparentBranches.length > 0 && (
                      <optgroup label="── תת-ענף מסבא / סבתא (דור 3) ──">
                        {selectedSourceCal.subBranches.grandparentBranches.map((gb) => (
                          <option key={gb.id} value={gb.id}>
                            {gb.label} ({gb.count})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {selectedSourceCal.subBranches.greatGrandparentBranches.length > 0 && (
                      <optgroup label="── תת-ענף מסבא-רבא / סבתא-רבתא (דור 4) ──">
                        {selectedSourceCal.subBranches.greatGrandparentBranches.map((ggb) => (
                          <option key={ggb.id} value={ggb.id}>
                            {ggb.label} ({ggb.count})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>מספר דורות מהעץ לכלול:</span>
                  </label>
                  <select
                    value={maxGenerations}
                    onChange={(e) => setMaxGenerations(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                  >
                    <option value="all">כל הדורות בענף (ללא הגבלה)</option>
                    <option value="3">עד 3 דורות (הורים, סבים וסבתות)</option>
                    <option value="4">עד 4 דורות (כולל סבא-רבא / סבתא-רבתא)</option>
                    <option value="5">עד 5 דורות מהעץ</option>
                    <option value="6">עד 6 דורות מהעץ</option>
                  </select>
                </div>
              </div>

              {/* Tree Position Definition for Joining User */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>היכן אתה מוגדר בעץ המשפחה? (לחישוב קרבה מדויק של כל הדורות אליך)</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[10px] font-black text-purple-900 shrink-0">
                    הדור שלך: {userGen}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      בחר את סוג הקרבה שלך בעץ:
                    </label>
                    <select
                      value={treeRelation}
                      onChange={(e) => handleRelationTypeChange(e.target.value as TreeRelationType)}
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                    >
                      {TREE_RELATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {treeRelation !== 'general' && (selectedSourceCal.people?.length || 0) > 0 ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        בחר את האדם בעץ שאליו מתייחסת הקרבה:
                      </label>
                      <select
                        value={treeAnchorId}
                        onChange={(e) => handleSelectAnchorPerson(e.target.value)}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                      >
                        <option value="">-- בחר בן משפחה מהעץ --</option>
                        {filteredSourcePeople.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (דור {p.generation || 2}
                            {p.relationship ? ` • ${p.relationship}` : ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        בחר את הדור שלך בעץ ביחס ל{selectedSourceCal.created_by_user_name || 'בעל היומן'}:
                      </label>
                      <select
                        value={userGen}
                        onChange={(e) => setUserGen(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-purple-200 rounded-xl px-2.5 py-2 cursor-pointer outline-none"
                      >
                        <option value={1}>דור 1 — אותו דור כמו {selectedSourceCal.created_by_user_name || 'בעל היומן'} (אח/אחות/בן דוד)</option>
                        <option value={0}>דור 0 — דור הילדים / אחיינים של {selectedSourceCal.created_by_user_name || 'בעל היומן'}</option>
                        <option value={-1}>דור -1 — דור הנכדים של {selectedSourceCal.created_by_user_name || 'בעל היומן'}</option>
                        <option value={-2}>דור -2 — דור הנינים של {selectedSourceCal.created_by_user_name || 'בעל היומן'}</option>
                        <option value={2}>דור 2 — דור ההורים / דודים של {selectedSourceCal.created_by_user_name || 'בעל היומן'}</option>
                        <option value={3}>דור 3 — דור הסבים והסבתות</option>
                      </select>
                    </div>
                  )}
                </div>

                {selectedAnchorPerson && treeRelation !== 'general' && (
                  <p className="text-[11px] font-bold text-purple-900 bg-white/80 border border-purple-200/80 rounded-xl px-2.5 py-1.5">
                    📍 המיקום שלך בעץ הוגדר:{' '}
                    <span className="text-purple-700">
                      {TREE_RELATION_OPTIONS.find((o) => o.value === treeRelation)?.shortPrefix}{' '}
                      {selectedAnchorPerson.name}
                    </span>{' '}
                    (מחושב כדור {userGen} בעץ — ניתן לשנות בכל עת גם מתוך תצוגת העץ).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Target Calendar to Merge Into */}
          {userCalendars.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                3. לאיזה יומן שלך לשלב ולאחד את הענף?
              </label>
              <select
                value={targetCalendarId}
                onChange={(e) => setTargetCalendarId(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 cursor-pointer outline-none focus:border-indigo-500"
              >
                {userCalendars.map((myCal) => (
                  <option key={myCal.id} value={myCal.id}>
                    איחוד לתוך: {formatCalendarDisplayName(myCal.name)} (יופיע באותו יומן Google)
                  </option>
                ))}
                <option value="all">כל היומנים שלי בחשבון</option>
              </select>
            </div>
          )}

          {/* Step 4: Permission Level & Note */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              4. סוג ההרשאה המבוקשת מבעל היומן:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRequestedRole('member')}
                className={`p-3 rounded-2xl border text-right transition flex items-start gap-2.5 cursor-pointer ${
                  requestedRole === 'member'
                    ? 'bg-blue-50/90 border-blue-600 ring-1 ring-blue-600/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Eye className={`w-4 h-4 mt-0.5 shrink-0 ${requestedRole === 'member' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-900">צפייה וסנכרון אוטומטי</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    הענף ישולב ביומן שלך ויתעדכן אוטומטית בכל שינוי
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRequestedRole('editor')}
                className={`p-3 rounded-2xl border text-right transition flex items-start gap-2.5 cursor-pointer ${
                  requestedRole === 'editor'
                    ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Edit3 className={`w-4 h-4 mt-0.5 shrink-0 ${requestedRole === 'editor' ? 'text-amber-700' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-900">הרשאת עריכה בענף</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    אפשרות גם להוסיף ולעדכן תאריכי פטירה בענף המשותף
                  </span>
                </div>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                הערה קצרה לבעל היומן (אופציונלי — למשל הסבר על הקרבה המשפחתית):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="למשל: שלום, אני נכד של... ואשמח לצרף את הענף ליומן המשפחתי שלי"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {resultMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold leading-relaxed ${
                resultMessage.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : resultMessage.type === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              {resultMessage.text}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              סגור
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSourceCal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'שולח...'
                  : autoApproveIfAlreadyMember
                  ? 'אחד ושלב ענף זה ביומן שלי'
                  : 'שלח בקשת הצטרפות לענף'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
