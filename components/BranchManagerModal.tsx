'use client';

import React, { useState } from 'react';
import { FamilyBranch, DeceasedPerson } from '@/lib/types';
import { X, Plus, Trash2, Layers, AlertCircle } from 'lucide-react';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: FamilyBranch[];
  deceased: DeceasedPerson[];
  calendarId: string;
  onAddBranch: (name: string, color: string) => Promise<void>;
  onDeleteBranch: (branchId: string) => Promise<void>;
}

const PRESET_COLORS = [
  { label: 'כחול', val: '#2563eb' },
  { label: 'ירוק', val: '#059669' },
  { label: 'ענבר', val: '#d97706' },
  { label: 'סגול', val: '#7c3aed' },
  { label: 'ורוד-אדום', val: '#e11d48' },
  { label: 'טורקיז', val: '#0891b2' },
];

export const BranchManagerModal: React.FC<BranchManagerModalProps> = ({
  isOpen,
  onClose,
  branches,
  deceased,
  onAddBranch,
  onDeleteBranch,
}) => {
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchColor, setNewBranchColor] = useState(PRESET_COLORS[0].val);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setIsAdding(true);
    try {
      await onAddBranch(newBranchName.trim(), newBranchColor);
      setNewBranchName('');
    } finally {
      setIsAdding(false);
    }
  };

  const getDeceasedCount = (branchId: string) => {
    return deceased.filter((d) => d.branch_id === branchId).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">ניהול ענפי משפחה ביומן</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Add Form */}
          <form onSubmit={handleAdd} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">הוספת ענף משפחתי חדש:</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="למשל: ענף סבא יצחק (צד שמואל)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={isAdding || !newBranchName.trim()}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף</span>
              </button>
            </div>

            {/* Color choices */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">צבע מייצג:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => setNewBranchColor(c.val)}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      newBranchColor === c.val ? 'border-slate-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.val }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Existing branches list */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700">ענפים קיימים ({branches.length}):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {branches.map((b) => {
                const count = getDeceasedCount(b.id);
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-800">{b.name}</span>
                        <span className="text-xs text-slate-500 block">
                          {count} {count === 1 ? 'נפטר רשום' : 'נפטרים רשומים'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `האם למחוק את הענף "${b.name}"? ${
                              count > 0 ? `פעולה זו תמחק גם ${count} נפטרים הרשומים תחתיו!` : ''
                            }`
                          )
                        ) {
                          onDeleteBranch(b.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="מחק ענף"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
