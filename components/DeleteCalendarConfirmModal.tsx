'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { CalendarProject } from '@/lib/types';

interface DeleteCalendarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: CalendarProject | null;
  onConfirmDelete: (calendarId: string) => Promise<void>;
}

export const DeleteCalendarConfirmModal: React.FC<DeleteCalendarConfirmModalProps> = ({
  isOpen,
  onClose,
  calendar,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !calendar) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(calendar.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete calendar:', err);
      setError(err.message || 'שגיאה במחיקת היומן');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden relative text-right">
        {/* Top Danger Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-serif">
                מחיקת יומן לצמיתות
              </h2>
              <p className="text-xs text-red-600 font-bold mt-0.5">
                פעולה בלתי הפיכה
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-red-900 leading-relaxed font-medium">
              <p>
                האם אתה בטוח שברצונך למחוק את <strong>״{calendar.name}״</strong>?
              </p>
              <p className="text-red-700">
                כל הנפטרים, ענפי המשפחה וההגדרות ביומן זה יימחקו לצמיתות ולא ניתן יהיה לשחזרם.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-100 text-red-800 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              ביטול
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'מוחק יומן...' : 'כן, מחק יומן זה לצמיתות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
