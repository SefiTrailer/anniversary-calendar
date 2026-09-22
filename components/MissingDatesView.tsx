'use client';

import React, { useState } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import { AlertTriangle, Calendar, PlusCircle, Search, Edit3, CheckCircle2, Bookmark } from 'lucide-react';

interface MissingDatesViewProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  onEditDeceased: (deceased: DeceasedPerson) => void;
}

export const MissingDatesView: React.FC<MissingDatesViewProps> = ({
  deceased,
  branches,
  onEditDeceased,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  const branchMap = new Map(branches.map(b => [b.id, b]));

  // Find all people with missing or incomplete date
  const missing = deceased.filter(p => !p.hebrew_day || !p.hebrew_month);

  const filtered = missing.filter(p => {
    if (selectedBranchId !== 'all' && p.branch_id !== selectedBranchId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `${p.title || ''} ${p.first_name} ${p.last_name} ${p.relationship || ''} ${p.notes || ''}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-50 to-orange-50/40 border border-amber-300/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>רובריקת ״ללא תאריך״ (להשלמת ימי פטירה)</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                  {missing.length} דמויות
                </span>
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                כאן מרוכזים כל אבות ואמהות המשפחה המופיעים באילן היוחסין שיום פטירתם המדויק טרם אומת סופית. 
                בלחיצה על ״השלם תאריך פטירה״ תוכל להזין את היום והחודש ברגע שיימצאו רישומים או תמונת מצבה.
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-4 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedBranchId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedBranchId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              הכל ({missing.length})
            </button>
            {branches.map(b => {
              const count = missing.filter(p => p.branch_id === b.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  style={{
                    backgroundColor: selectedBranchId === b.id ? b.color : 'white',
                    color: selectedBranchId === b.id ? 'white' : '#334155',
                    borderColor: b.color,
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                >
                  {b.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש דמות ללא תאריך..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>
      </div>

      {/* Grid of Missing Persons */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">כל תאריכי הפטירה בענף זה מאומתים!</h3>
          <p className="text-xs text-slate-500 mt-1">אין כרגע דמויות הממתינות להשלמת תאריך.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const branch = branchMap.get(p.branch_id);
            const isMartyr = p.notes?.includes('הי"ד') || p.last_name?.includes('הי"ד');
            const suffix = isMartyr ? 'הי"ד' : (p.gender === 'female' || p.title === 'מרת' ? 'ע"ה' : 'ז"ל');

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 right-0 left-0 h-1"
                  style={{ backgroundColor: branch?.color || '#2563eb' }}
                />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {p.relationship || `דור ${p.generation || 2}`}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-2xs font-bold text-white"
                      style={{ backgroundColor: branch?.color || '#2563eb' }}
                    >
                      {branch?.name}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-1.5 flex-wrap">
                    {p.title && <span className="text-amber-800">{p.title}</span>}
                    <span>{p.first_name}</span>
                    <span>{p.last_name}</span>
                    <span className="text-xs text-slate-400 font-normal">{suffix}</span>
                  </h3>

                  {p.father_or_mother_name && (
                    <p className="text-xs text-slate-500 mb-2">
                      {p.father_or_mother_name}
                    </p>
                  )}

                  {/* Context/Notes if known (e.g. month or circumstance) */}
                  <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-950 mb-4">
                    <div className="font-semibold text-2xs text-amber-800 mb-1 flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />
                      <span>מידע ידוע כעת:</span>
                    </div>
                    <p className="text-2xs leading-relaxed text-slate-700">
                      {p.notes || (p.hebrew_month ? `ידוע שנפטר/ה בחודש ${p.hebrew_month}` : 'טרם תועדו פרטים.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onEditDeceased(p)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>השלם תאריך פטירה</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
