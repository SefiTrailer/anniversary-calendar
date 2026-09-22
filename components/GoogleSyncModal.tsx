'use client';

import React, { useState, useEffect } from 'react';
import { FamilyBranch, UserMembership } from '@/lib/types';
import { X, Copy, Check, ExternalLink, Download, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: FamilyBranch[];
  membership: UserMembership | null;
  calendarName: string;
  onUpdateBranches: (selectedBranchIds: string[]) => Promise<void>;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  branches,
  membership,
  calendarName,
  onUpdateBranches,
}) => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    if (membership) {
      setSelectedBranches(membership.selected_branch_ids || []);
    } else {
      setSelectedBranches(branches.map((b) => b.id));
    }
  }, [membership, branches, isOpen]);

  if (!isOpen) return null;

  const token = membership?.feed_token || 'demo-token-default';
  const httpsUrl = `${origin}/api/calendar/${token}`;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, 'webcal://');

  const toggleBranch = async (branchId: string) => {
    const updated = selectedBranches.includes(branchId)
      ? selectedBranches.filter((id) => id !== branchId)
      : [...selectedBranches, branchId];

    setSelectedBranches(updated);
    setIsSaving(true);
    try {
      await onUpdateBranches(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const selectAll = async () => {
    const all = branches.map((b) => b.id);
    setSelectedBranches(all);
    await onUpdateBranches(all);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(httpsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const googleCalendarSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    httpsUrl
  )}`;

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
                קבל עדכונים חיים ליומן האישי שלך בהתאמה אישית לענפי המשפחה שלך
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
        <div className="p-6 space-y-6">
          {/* Branch Filtering Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">
                1. בחר אילו ענפי משפחה לסנכרן ליומן שלך:
              </h3>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                בחר הכל
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              סימון ענף יציג ביומן שלך רק את ימי השנה (יארצייט) של אותו ענף, בלי להעמיס שמות שאינם מהצד שלך.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {branches.map((b) => {
                const isChecked = selectedBranches.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-50/60 border-blue-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBranch(b.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: b.color || '#2563eb' }}
                    />
                  </label>
                );
              })}
            </div>
            {isSaving && (
              <span className="text-[11px] text-blue-600 font-medium block mt-2 animate-pulse">
                שומר את בחירת הענפים... הפיד מתעדכן בזמן אמת!
              </span>
            )}
          </div>

          {/* Feed URL & Direct Google Button */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              2. התחברות ליומן בלחיצה אחת:
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
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm shadow-sm transition"
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
              ✨ מעתה והלאה, ימי השנה של הנפטרים בענפים שלך יופיעו אוטומטית בכל שנה קדימה!
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
            <span>הורד כקובץ .ICS חד-פעמי</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-sm"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
