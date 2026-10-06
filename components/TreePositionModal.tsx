'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  TreeRelationType,
  UserTreePosition,
  TREE_RELATION_OPTIONS,
  calculateUserGenFromAnchor,
  formatUserTreePositionLabel,
  getDeceasedFullName,
  cleanLivingMarkerFromText,
  isPersonLiving,
} from '@/lib/hebrew-calendar';
import {
  X,
  GitCommit,
  Search,
  Check,
  UserCheck,
  Sparkles,
  Plus,
  Users,
} from 'lucide-react';

interface TreePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  currentPosition: UserTreePosition;
  calendarOwnerName?: string;
  preselectedPerson?: DeceasedPerson | null;
  canEdit?: boolean;
  onSavePosition: (newPos: UserTreePosition) => Promise<void> | void;
  onOpenAddSelfToTree?: () => void;
}

export const TreePositionModal: React.FC<TreePositionModalProps> = ({
  isOpen,
  onClose,
  deceased,
  branches,
  currentPosition,
  calendarOwnerName,
  preselectedPerson,
  canEdit = false,
  onSavePosition,
  onOpenAddSelfToTree,
}) => {
  const [relationType, setRelationType] = useState<TreeRelationType>(
    currentPosition.relationType || 'child_of'
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    currentPosition.anchorPersonId || ''
  );
  const [manualGen, setManualGen] = useState<number>(currentPosition.userGeneration ?? 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedPerson) {
      const nextRel: TreeRelationType = isPersonLiving(preselectedPerson) ? 'self' : 'child_of';
      setRelationType(nextRel);
      setSelectedPersonId(preselectedPerson.id);
      setManualGen(
        calculateUserGenFromAnchor(preselectedPerson.generation ?? 2, nextRel)
      );
      setSearchQuery('');
    } else {
      setRelationType(
        currentPosition.anchorPersonId || currentPosition.anchorPersonName
          ? currentPosition.relationType
          : currentPosition.relationType === 'general'
          ? 'general'
          : 'child_of'
      );
      setSelectedPersonId(currentPosition.anchorPersonId || '');
      setManualGen(currentPosition.userGeneration ?? 1);
      setSearchQuery('');
    }
  }, [isOpen, preselectedPerson, currentPosition]);

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return deceased.find((p) => p.id === selectedPersonId) || null;
  }, [deceased, selectedPersonId]);

  const activeRelationOption = useMemo(
    () =>
      TREE_RELATION_OPTIONS.find((o) => o.value === relationType) ||
      TREE_RELATION_OPTIONS[0],
    [relationType]
  );

  // Filtered people in the tree for picking an anchor
  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deceased
      .filter((p) => {
        if (branchFilter !== 'all' && p.branch_id !== branchFilter) return false;
        if (!q) return true;
        const full = `${getDeceasedFullName(p)} ${p.father_or_mother_name || ''} ${
          p.relationship || ''
        }`.toLowerCase();
        return full.includes(q);
      })
      .sort((a, b) => {
        const genA = typeof a.generation === 'number' ? a.generation : 2;
        const genB = typeof b.generation === 'number' ? b.generation : 2;
        if (genA !== genB) return genA - genB;
        return getDeceasedFullName(a).localeCompare(getDeceasedFullName(b), 'he');
      });
  }, [deceased, branchFilter, searchQuery]);

  if (!isOpen) return null;

  const handleSelectRelation = (nextRel: TreeRelationType) => {
    setRelationType(nextRel);
    if (nextRel !== 'general' && selectedPerson) {
      setManualGen(
        calculateUserGenFromAnchor(selectedPerson.generation ?? 2, nextRel)
      );
    }
  };

  const handleSelectPerson = (person: DeceasedPerson) => {
    setSelectedPersonId(person.id);
    const nextRel = relationType === 'general' ? 'child_of' : relationType;
    if (relationType === 'general') {
      setRelationType('child_of');
    }
    setManualGen(calculateUserGenFromAnchor(person.generation ?? 2, nextRel));
  };

  const previewPosition: UserTreePosition = {
    userGeneration: manualGen,
    relationType:
      activeRelationOption.needsAnchor &&
      (selectedPerson || currentPosition.anchorPersonName)
        ? relationType
        : 'general',
    anchorPersonId:
      activeRelationOption.needsAnchor && selectedPerson
        ? selectedPerson.id
        : activeRelationOption.needsAnchor
        ? currentPosition.anchorPersonId
        : undefined,
    anchorPersonName:
      activeRelationOption.needsAnchor && selectedPerson
        ? getDeceasedFullName(selectedPerson)
        : activeRelationOption.needsAnchor
        ? currentPosition.anchorPersonName
        : undefined,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSavePosition(previewPosition);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[92vh] overflow-y-auto relative text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 sticky top-0 z-10" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 sticky top-2 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shadow-inner">
              <GitCommit className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                היכן אני מוגדר בעץ המשפחה?
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                בחר את הקשר המשפחתי שלך לדמות בעץ — והמערכת תחשב את כל הדורות והקשרים ביחס אליך
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">התאמה אישית של עץ המשפחה עבורך:</span>
              <span className="text-amber-900 leading-relaxed block">
                כל בן משפחה שמצטרף ליומן יכול לבחור למי הוא קשור בעץ (למשל: <strong>אני בן/בת של...</strong> או <strong>אני נכד/ה של...</strong>). לפי בחירתך, מספרי הדורות וסינון הדורות ביומן יתאימו אוטומטית למקומך בעץ!
              </span>
            </div>
          </div>

          {/* Step 1: Select Relationship Type */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800">
              1. איך אתה מוגדר ביחס לעץ המשפחה?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TREE_RELATION_OPTIONS.map((opt) => {
                const isSelected = relationType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectRelation(opt.value)}
                    className={`p-2.5 rounded-xl border text-right text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500/30 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Anchor Person from the Tree (when needsAnchor is true) */}
          {activeRelationOption.needsAnchor && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-extrabold text-slate-800">
                  2. בחר את הדמות מהעץ ({activeRelationOption.shortPrefix}...):
                </label>
                {branches.length > 1 && (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer outline-none"
                  >
                    <option value="all">כל הענפים ({deceased.length})</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש שם של אבא/אמא, סבא/סבתא או קרוב משפחה בעץ..."
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* People List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50">
                {filteredPeople.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    לא נמצאו דמויות תואמות לחיפוש בעץ.
                  </div>
                ) : (
                  filteredPeople.slice(0, 60).map((p) => {
                    const isSelected = p.id === selectedPersonId;
                    const br = branchMap.get(p.branch_id);
                    const living = isPersonLiving(p);
                    const pGen = typeof p.generation === 'number' ? p.generation : 2;
                    const cleanRel = cleanLivingMarkerFromText(p.relationship);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPerson(p)}
                        className={`w-full p-2.5 rounded-xl border text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white hover:bg-indigo-50/50 text-slate-800 border-slate-200/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold font-serif truncate">
                              {getDeceasedFullName(p)}
                            </span>
                            {living && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                  isSelected
                                    ? 'bg-emerald-500/30 text-emerald-100'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                בחיים
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap ${
                              isSelected ? 'text-indigo-100' : 'text-slate-500'
                            }`}
                          >
                            <span>דור {pGen} בעץ</span>
                            {cleanRel && <span>• {cleanRel}</span>}
                            {br && <span>• {br.name}</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white text-indigo-700 text-[10px] font-black">
                              <Check className="w-3 h-3" />
                              <span>נבחר</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50">
                              בחר
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 3: Generation Verification / Manual Adjustment */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-extrabold text-slate-800">
              {activeRelationOption.needsAnchor
                ? '3. שיוך הדור שלך בעץ (מחושב אוטומטית — ניתן גם לדייק ידנית):'
                : '2. בחר את הדור שלך בעץ המשפחה:'}
            </label>
            <select
              value={manualGen}
              onChange={(e) => setManualGen(Number(e.target.value))}
              className="w-full text-xs font-bold text-slate-900 bg-amber-50/70 border border-amber-300 rounded-xl px-3 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-amber-500 font-serif"
            >
              <option value={4}>דור 4 (דור סבא-רבא / סבתא-רבתא)</option>
              <option value={3}>דור 3 (דור סבא / סבתא)</option>
              <option value={2}>דור 2 (דור ההורים, דודים ודודות)</option>
              <option value={1}>
                דור 1 (הדור של בעל היומן
                {calendarOwnerName ? ` — ${calendarOwnerName}` : ''}, אחים ובני דודים)
              </option>
              <option value={0}>דור 0 (דור הילדים והאחיינים)</option>
              <option value={-1}>דור 1- (דור הנכדים)</option>
              <option value={-2}>דור 2- (דור הנינים)</option>
              <option value={-3}>דור 3- (דור בני הנינים)</option>
            </select>
          </div>

          {/* Live Summary Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-l from-indigo-50 via-blue-50/70 to-amber-50/60 border border-indigo-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-800 block">
                  המיקום המוגדר שלך בעץ המשפחה:
                </span>
                <span className="text-sm font-black text-slate-900 font-serif block mt-0.5">
                  {formatUserTreePositionLabel(previewPosition, calendarOwnerName)}
                </span>
              </div>
            </div>
          </div>

          {/* Optional: Add Self to Tree as Living Record */}
          {canEdit && onOpenAddSelfToTree && (
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-medium">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>רוצה גם להופיע בעצמך כחלק מעץ המשפחה (עם יום הולדת עברי)?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddSelfToTree();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 transition cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף אותי לעץ</span>
              </button>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'שומר מיקום בעץ...' : 'שמור את המיקום שלי בעץ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
