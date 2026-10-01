'use client';

import React, { useState } from 'react';
import { X, GitCommit, Check, Copy, ExternalLink, Flame, ArrowDown, User, Heart, Calendar } from 'lucide-react';
import { DeceasedPerson } from '@/lib/types';
import {
  getDeceasedFullName,
  getDeceasedFormattedParts,
  getGenerationRelationInfo,
  formatDisplayDateWithGregorian,
} from '@/lib/hebrew-calendar';

interface LineageStep {
  gen: number;
  name: string;
  relation: string;
  nodeId?: string;
  deceased_id?: string;
}

interface LineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: DeceasedPerson | null;
  currentUser?: { name?: string; email?: string } | null;
  userGeneration?: number;
}

function getChildConnector(stepName: string, stepRelation?: string): 'בן' | 'בת' {
  const femaleWords = [
    'חיה', 'גולדה', 'לאה', 'שרה', 'רבקה', 'רחל', 'מרים', 'חנה', 'מלכה', 'בינה',
    'דבורה', 'אסתר', 'פייגא', 'גיטל', 'צפורה', 'מרגית', 'רונית', 'בלה', 'פרומה',
    'ליבה', 'בריינה', 'שפרינצה', 'שיינדל', 'הינדא', 'פריידא', 'טויבא', 'מרגלא', 'הענא'
  ];
  const rel = stepRelation || '';
  if (
    rel.includes('אם') ||
    rel.includes('סבתא') ||
    rel.includes('דודה') ||
    rel.includes('אחות') ||
    rel.includes('בת') ||
    stepName.includes('מרת') ||
    stepName.includes('הרבנית')
  ) {
    return 'בת';
  }
  const words = stepName.split(/[\s\-()]+/);
  if (words.some(w => femaleWords.includes(w))) {
    return 'בת';
  }
  return 'בן';
}

export default function LineageModal({
  isOpen,
  onClose,
  person,
  currentUser,
  userGeneration = 1,
}: LineageModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !person) return null;

  const rawPath: LineageStep[] = Array.isArray(person.lineage_path) && person.lineage_path.length > 0
    ? (person.lineage_path as LineageStep[])
    : [
        { gen: 1, name: currentUser?.name || 'יוסף שלום זאב (ספי) רייכקינד', relation: 'אני / בעל היומן' },
        { gen: person.generation || 2, name: getDeceasedFullName(person), relation: person.relationship || `דור ${person.generation || 2}` }
      ];

  // Build full chain with "בן/בת":
  // "ספי ➔ בן מיכאל ➔ בן חיה ➔ בת גולדה לאה ➔ בת רבי שמואל גדליה"
  const chainSentence = rawPath.map((step, idx) => {
    if (idx === 0) return step.name;
    const prevStep = rawPath[idx - 1];
    const connector = getChildConnector(prevStep.name, prevStep.relation);
    return `${connector} ${step.name}`;
  }).join(' ➔ ');

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?lineage=${person.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(chainSentence);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const targetFormatted = getDeceasedFormattedParts(person);
  const totalGenerations = rawPath.length;
  const genInfo = getGenerationRelationInfo(person, userGeneration);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-amber-950 text-white px-6 py-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight font-serif">
                  שרשרת הייחוס והקרבה
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-serif">
                  {totalGenerations} דורות בעץ
                </span>
              </div>
              <p className="text-xs text-slate-300 font-serif mt-0.5">
                מסלול הייחוס הרציף עד {targetFormatted.fullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-2 rounded-xl hover:bg-white/10 cursor-pointer"
            title="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Flow */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Quick Relationship Banner */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-serif font-black text-xs shrink-0 shadow-2xs ${
                genInfo.isDirect ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-purple-100 text-purple-900 border border-purple-300'
              }`}>
                <span className="text-sm">דור {genInfo.relativeGeneration}</span>
                {!genInfo.isDirect && <span className="text-[9px] font-bold">לא ישיר</span>}
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold block">הקרבה המשפחתית אליך:</span>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-base font-black text-slate-900 font-serif block">
                    {genInfo.fullDescription}
                  </span>
                  {genInfo.isDirect ? (
                    <span className="text-2xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md font-serif">
                      קשר ישיר של אב/אם קדמוני
                    </span>
                  ) : (
                    <span className="text-2xs font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md font-serif">
                      לא קשר ישיר של אב/אם קדמוני
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="העתק את שרשרת היוחסין"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedText ? 'הועתק!' : 'העתק שרשרת'}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition cursor-pointer"
                title="העתק קישור ישיר לעמוד זה"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'הקישור הועתק!' : 'העתק קישור'}</span>
              </button>
            </div>
          </div>

          {/* Full Lineage Verbal Chain Banner ("בן אחרי בן או בת") */}
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-white p-4 rounded-2xl border border-amber-300 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5 font-serif">
              <GitCommit className="w-4 h-4 text-amber-700" />
              <span>נוסח הייחוס המלא (בן אחרי בן / בת):</span>
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 font-serif leading-relaxed">
              {chainSentence}
            </p>
          </div>

          {/* Non-Direct Ancestor Notice */}
          {!genInfo.isDirect && (
            <div className="p-3.5 bg-purple-50/90 border border-purple-200 rounded-2xl text-xs text-purple-950 flex items-start gap-2.5">
              <GitCommit className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ציון אופי הקרבה:</span> דמות זו שייכת לדור {genInfo.relativeGeneration} ביחס אליך, אך <strong>אינה קשר ישיר של אב/אם קדמוני</strong> אלא ענף משפחתי עקיף ({genInfo.relationDescription}).
              </div>
            </div>
          )}

          {/* Step-by-Step Flow Cards */}
          <div className="space-y-1">
            {rawPath.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === rawPath.length - 1;
              const connector = getChildConnector(step.name, step.relation);

              return (
                <div key={`${step.gen}-${idx}`}>
                  {/* Step Card */}
                  <div className="flex items-start gap-3.5 group">
                    {/* Node Badge */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-serif font-black text-xs transition-all shadow-xs ${
                        isFirst
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : isLast
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-4 ring-amber-100 scale-105 shadow-md'
                          : 'bg-white text-slate-700 border-2 border-amber-300 group-hover:border-amber-500'
                      }`}
                    >
                      {isFirst ? (
                        <User className="w-5 h-5" />
                      ) : isLast ? (
                        <Flame className="w-5 h-5 text-amber-100 animate-pulse" />
                      ) : (
                        `ד׳ ${step.gen}`
                      )}
                    </div>

                    {/* Step Card Content */}
                    <div
                      className={`flex-1 p-4 rounded-2xl transition shadow-2xs ${
                        isLast
                          ? 'bg-gradient-to-r from-amber-50 via-amber-100/60 to-white border-2 border-amber-400 shadow-xs'
                          : isFirst
                          ? 'bg-blue-50/70 border border-blue-200'
                          : 'bg-white border border-slate-200/90 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md font-serif ${
                            isLast
                              ? 'bg-amber-600 text-white'
                              : isFirst
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {step.relation}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-serif">
                          דור {step.gen}
                        </span>
                      </div>

                      <h4
                        className={`font-serif font-black mt-2 leading-snug ${
                          isLast
                            ? 'text-lg text-amber-950'
                            : isFirst
                            ? 'text-base text-blue-950'
                            : 'text-base text-slate-800'
                        }`}
                      >
                        {step.name}
                      </h4>

                      {isLast && (
                        <div className="mt-2.5 pt-2 border-t border-amber-200/80 space-y-1">
                          {person.father_or_mother_name && (
                            <p className="text-xs text-slate-700 font-serif font-bold">
                              לעילוי נשמת: {person.father_or_mother_name}
                            </p>
                          )}
                          <p className="text-xs text-amber-900 font-serif font-bold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-700" />
                            <span>
                              תאריך פטירה: {formatDisplayDateWithGregorian(person.hebrew_day, person.hebrew_month, person.hebrew_year, person.gregorian_original_date)}
                            </span>
                          </p>
                          {person.notes && (
                            <p className="text-xs text-slate-600 font-sans mt-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/70 leading-relaxed">
                              {person.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Connector with "בן של" / "בת של" Badge */}
                  {!isLast && (
                    <div className="flex items-center gap-2 my-1 mr-4">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-amber-300" />
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs font-serif">
                        <ArrowDown className="w-3 h-3 text-amber-700" />
                        <span>{connector} של</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-serif">
            נתיב היוחסין מסונכרן אוטומטית גם עם תיאור האירוע ביומן גוגל וב-iCal.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
