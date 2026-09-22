'use client';

import React, { useState } from 'react';
import { X, Calendar, Plus, ShieldCheck } from 'lucide-react';

interface NewCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCalendar: (name: string, description: string) => Promise<void>;
  currentUserName: string;
}

export const NewCalendarModal: React.FC<NewCalendarModalProps> = ({
  isOpen,
  onClose,
  onCreateCalendar,
  currentUserName,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateCalendar(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">יצירת פרויקט יומן משפחתי חדש</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              כל פרויקט יומן מתנהל במרחב עצמאי לחלוטין <strong>ללא ערבוב מידע</strong> בין משפחות. כיוצר היומן, תוגדר אוטומטית כ<strong>מנהל היומן</strong> עם סמכויות מלאות.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              שם פרויקט היומן <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="למשל: יומן משפחת כהן המורחבת"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              תיאור קצר (אופציונלי)
            </label>
            <textarea
              rows={2}
              placeholder="למשל: ימי השנה של אבות המשפחה מצד סבא יוסף וסבתא מרים"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>צור יומן והגדר כמנהל</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
