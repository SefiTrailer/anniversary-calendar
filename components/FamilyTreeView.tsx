'use client';

import React, { useState } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import { formatDisplayDateWithGregorian } from '@/lib/hebrew-calendar';
import { Users, Calendar, AlertCircle, Edit2, Search, Filter, Sparkles, Heart } from 'lucide-react';

interface FamilyTreeViewProps {
  deceased: DeceasedPerson[];
  branches: FamilyBranch[];
  onEditDeceased: (deceased: DeceasedPerson) => void;
  onAddDeceased: (initialData?: Partial<DeceasedPerson>) => void;
}

export const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({
  deceased,
  branches,
  onEditDeceased,
  onAddDeceased,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissingDates, setOnlyMissingDates] = useState(false);

  const branchMap = new Map(branches.map(b => [b.id, b]));

  // Filter persons
  const filtered = deceased.filter(p => {
    if (selectedBranchId !== 'all' && p.branch_id !== selectedBranchId) return false;
    if (onlyMissingDates && p.hebrew_day && p.hebrew_month) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${p.title || ''} ${p.first_name} ${p.last_name} ${p.father_or_mother_name || ''} ${p.relationship || ''}`.toLowerCase();
      if (!matchName.includes(q)) return false;
    }
    return true;
  });

  // Group by generation
  const generationLabels: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'דור 1 • הורים', subtitle: 'אבא ואמא, עמודי התווך של הבית' },
    2: { title: 'דור 2 • סבים, סבתות ואחיהם', subtitle: 'סבא וסבתא מצד אב ומצד אם, דודים ודודות' },
    3: { title: 'דור 3 • סבא-רבא וסבתא-רבתא', subtitle: 'הורי הסבים והסבתות' },
    4: { title: 'דור 4 • סבא-רבא-רבא', subtitle: 'ראשי הישיבות, מנהיגי היישוב ומייסדי השכונות' },
    5: { title: 'דור 5 • אבות קדמונים', subtitle: 'בוני ירושלים ומייסדי היישוב היהודי בארץ' },
    6: { title: 'דור 6 • אבות קדמונים', subtitle: 'ממנהיגי עליית תלמידי הגר״א' },
    7: { title: 'דור 7 • אבות האומה ומחדשי היישוב', subtitle: 'מחדש היישוב האשכנזי (הרא״ש צורף)' },
  };

  const generations = Array.from(new Set(filtered.map(p => p.generation || 2))).sort((a, b) => a - b);

  const totalCount = deceased.length;
  const missingDatesCount = deceased.filter(p => !p.hebrew_day || !p.hebrew_month).length;
  const verifiedCount = totalCount - missingDatesCount;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-l from-amber-500/10 via-amber-100/50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">אילן היוחסין ועץ המשפחה המלא</h2>
            </div>
            <p className="text-sm text-slate-600">
              שורשי המשפחה מדור לדור: אבות ואמהות מכל הענפים (רייכקינד, רנדל, שטיינר, סלומון, פרוש, ניימן).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-white/80 border border-slate-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-medium">סך הכל בעץ</div>
              <div className="text-lg font-bold text-slate-900">{totalCount}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
              <div className="text-xs text-emerald-700 font-medium">תאריך מאומת</div>
              <div className="text-lg font-bold text-emerald-800">{verifiedCount}</div>
            </div>
            <div 
              onClick={() => setOnlyMissingDates(!onlyMissingDates)}
              className={`border rounded-xl px-3.5 py-2 text-center shadow-xs cursor-pointer transition-all ${
                onlyMissingDates 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105' 
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <div className={`text-xs font-medium ${onlyMissingDates ? 'text-amber-100' : 'text-amber-700'}`}>
                ללא תאריך
              </div>
              <div className="text-lg font-bold">{missingDatesCount}</div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-5 pt-4 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedBranchId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedBranchId === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              כל הענפים ({deceased.length})
            </button>
            {branches.map(b => {
              const count = deceased.filter(p => p.branch_id === b.id).length;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  style={{
                    backgroundColor: selectedBranchId === b.id ? b.color : 'white',
                    color: selectedBranchId === b.id ? 'white' : '#334155',
                    borderColor: b.color,
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-2xs`}
                >
                  {b.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש לפי שם, קרבה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            {onlyMissingDates && (
              <button
                onClick={() => setOnlyMissingDates(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg"
              >
                הצג הכל
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generations Tree Flow */}
      <div className="space-y-10">
        {generations.map((gen) => {
          const genPersons = filtered.filter(p => (p.generation || 2) === gen);
          if (genPersons.length === 0) return null;

          const meta = generationLabels[gen] || { title: `דור ${gen}`, subtitle: `אבות קדמונים` };

          return (
            <div key={gen} className="relative">
              {/* Generation Header Divider */}
              <div className="flex items-center gap-4 mb-5">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
                <div className="text-center px-4 py-1.5 bg-slate-900 text-white rounded-full shadow-xs">
                  <span className="text-sm font-bold">{meta.title}</span>
                  <span className="text-xs text-slate-300 mr-2">({genPersons.length})</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
              </div>
              <p className="text-center text-xs text-slate-500 mb-6">{meta.subtitle}</p>

              {/* People Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {genPersons.map((p) => {
                  const branch = branchMap.get(p.branch_id);
                  const isMissingDate = !p.hebrew_day || !p.hebrew_month;
                  const isMartyr = p.notes?.includes('הי"ד') || p.last_name?.includes('הי"ד');
                  const suffix = isMartyr ? 'הי"ד' : (p.gender === 'female' || p.title === 'מרת' ? 'ע"ה' : 'ז"ל');

                  return (
                    <div
                      key={p.id}
                      onClick={() => onEditDeceased(p)}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top colored stripe matching branch */}
                      <div 
                        className="absolute top-0 right-0 left-0 h-1.5"
                        style={{ backgroundColor: branch?.color || '#2563eb' }}
                      />

                      <div>
                        {/* Top row: Relationship & Branch badge */}
                        <div className="flex items-center justify-between gap-2 mb-2 pt-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
                            {p.relationship || `דור ${p.generation || 2}`}
                          </span>
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold text-white shadow-2xs"
                            style={{ backgroundColor: branch?.color || '#2563eb' }}
                          >
                            {branch?.name || 'ענף משפחתי'}
                          </span>
                        </div>

                        {/* Person Name & Title */}
                        <div className="mb-2">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5 flex-wrap">
                            {p.title && <span className="text-amber-700 font-semibold">{p.title}</span>}
                            <span>{p.first_name}</span>
                            <span>{p.last_name}</span>
                            <span className="text-xs text-slate-400 font-normal">{suffix}</span>
                          </h3>
                          {p.father_or_mother_name && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {p.father_or_mother_name}
                            </p>
                          )}
                        </div>

                        {/* Notes preview */}
                        {p.notes && (
                          <p className="text-2xs text-slate-600 line-clamp-2 bg-slate-50 rounded-lg p-2 mb-3 border border-slate-100">
                            {p.notes}
                          </p>
                        )}
                      </div>

                      {/* Date Status Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {isMissingDate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>ללא תאריך • לחץ להשלמה</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {formatDisplayDateWithGregorian(p.hebrew_day, p.hebrew_month, p.hebrew_year, p.gregorian_original_date)}
                            </span>
                          </span>
                        )}

                        <span className="text-slate-400 group-hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
