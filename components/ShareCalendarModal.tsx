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
  Sparkles,
} from 'lucide-react';
import { CalendarProject, FamilyBranch, DeceasedPerson } from '@/lib/types';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarProject | null;
  branches: FamilyBranch[];
  deceased: DeceasedPerson[];
  feedToken?: string;
}

export const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({
  isOpen,
  onClose,
  calendar,
  branches,
  deceased,
  feedToken = 'shared',
}) => {
  // By default, select all branches
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() =>
    branches.map((b) => b.id)
  );
  const [copiedWebLink, setCopiedWebLink] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

  // Sync selected branches when branches change
  React.useEffect(() => {
    if (branches.length > 0) {
      setSelectedBranchIds(branches.map((b) => b.id));
    }
  }, [branches]);

  if (!isOpen || !calendar) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yahrzeit-calendar.vercel.app';

  // Toggle single branch
  const toggleBranch = (id: string) => {
    if (selectedBranchIds.includes(id)) {
      if (selectedBranchIds.length === 1) return; // Keep at least one
      setSelectedBranchIds(selectedBranchIds.filter((bId) => bId !== id));
    } else {
      setSelectedBranchIds([...selectedBranchIds, id]);
    }
  };

  const selectAll = () => setSelectedBranchIds(branches.map((b) => b.id));
  const isAllSelected = selectedBranchIds.length === branches.length;
  const isPartialSelected = selectedBranchIds.length < branches.length;

  // Compute deceased count in selected branches
  const selectedDeceasedCount = deceased.filter((d) =>
    selectedBranchIds.includes(d.branch_id)
  ).length;

  // Selected branch names
  const selectedBranchNames = branches
    .filter((b) => selectedBranchIds.includes(b.id))
    .map((b) => b.name);

  // Generate web share link
  const branchParam = selectedBranchIds.join(',');
  const webShareUrl = `${origin}/?share=true&calendarId=${calendar.id}&branches=${branchParam}`;

  // Generate iCal / WebCal sync link
  const protocol = origin.startsWith('https') ? 'webcal:' : 'http:';
  const cleanHost = origin.replace(/^https?:\/\//, '');
  const webcalUrl = `${protocol}//${cleanHost}/api/calendar/${feedToken}?branches=${branchParam}`;
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
    const branchLabel = isAllSelected
      ? 'כל הענפים'
      : selectedBranchNames.join(' + ');
    const text = `שלום! מצורף קישור ליומן הזיכרון והיארצייט המשפחתי עבור *${calendar.name}* (ענף: ${branchLabel}):\n\n${webShareUrl}\n\nהקישור מציג את תאריכי היארצייט העבריים, אזכרות קרובות, ואפשרות להוסיף ישירות ליומן Google שלך בלחיצה אחת.`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden relative text-right">
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                שיתוף יומן משפחתי לפי ענפים
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {calendar.name} &bull; בחירת ענפים לשיתוף ממוקד
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
          {/* Step 1: Branch Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                1. בחר אילו ענפי משפחה לשתף:
              </label>
              <div className="flex items-center gap-2 text-xs">
                {isPartialSelected && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    שיתוף חלקי פעיל
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
              נבחרו <strong className="text-slate-800">{selectedBranchIds.length}</strong> מתוך {branches.length} ענפים ({selectedDeceasedCount} נפטרים יוצגו למקבל הקישור).
            </p>
          </div>

          {/* Step 2: Sharing Channels */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              2. בחר כיצד לשתף:
            </label>

            {/* WhatsApp Quick Share Button */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-sm shadow-md transition transform hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>שתף ישירות בוואטסאפ (עם הודעה מוכנה)</span>
            </button>

            {/* Web Link Input & Copy */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                קישור צפייה ישיר באינטרנט:
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
                  <span>סנכרון ישיר ליומן גוגל (עבור הענפים שנבחרו)</span>
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
                  onClick={() => handleCopy(webcalUrl, 'sync')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs transition shrink-0 cursor-pointer"
                >
                  {copiedSyncLink ? 'הועתק!' : 'העתק WebCal'}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Isolation Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              פרטיות מובטחת: מקבלי הקישור יוכלו לראות אך ורק את הנפטרים של הענפים שסימנת למעלה.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
