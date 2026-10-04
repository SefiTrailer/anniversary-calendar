'use client';

import React, { useState } from 'react';
import { X, GitCommit, Check, Copy, ExternalLink, Flame, ArrowDown, ArrowLeft, User, Heart, Calendar } from 'lucide-react';
import { DeceasedPerson } from '@/lib/types';
import {
  getDeceasedFullName,
  getDeceasedFormattedParts,
  getGenerationRelationInfo,
  formatDisplayDateWithGregorian,
  formatLeiluyNishmat,
} from '@/lib/hebrew-calendar';

interface LineageStep {
  gen: number;
  name: string;
  relation: string;
  gender?: 'male' | 'female';
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

function getStepGender(step: { name?: string; relation?: string; gender?: 'male' | 'female' } | string, maybeRel?: string): 'male' | 'female' {
  if (typeof step === 'object' && step !== null) {
    if (step.gender === 'male' || step.gender === 'female') return step.gender;
    return getStepGender(step.name || '', step.relation || '');
  }
  const stepName = (typeof step === 'string' ? step : '') || '';
  const rel = maybeRel || '';

  // 1. Explicit female titles/prefixes take highest priority
  if (
    stepName.startsWith('מרת ') ||
    stepName.startsWith('אשת ') ||
    stepName.startsWith('בת ') ||
    stepName.startsWith('הרבנית ') ||
    stepName.includes('לבית') ||
    rel.includes('אם קדמונית') ||
    rel.includes('סבתא') ||
    rel.includes('דודה') ||
    rel.includes('אחות') ||
    rel === 'אם' ||
    rel.startsWith('אם ')
  ) {
    return 'female';
  }

  // 2. Explicit male titles
  if (
    stepName.startsWith('רבי ') ||
    stepName.startsWith("ר' ") ||
    stepName.startsWith('הגאון ') ||
    stepName.startsWith('הרב ') ||
    stepName.startsWith('רבנו ') ||
    stepName.startsWith('הרה"ק ') ||
    stepName.startsWith('הרה"ח ') ||
    stepName.startsWith('הקצין ') ||
    stepName.startsWith('האלוף ') ||
    stepName.startsWith('הפוסק ') ||
    stepName.includes('אב"ד') ||
    stepName.includes('ראב"ד') ||
    rel.includes('אב קדמון') ||
    rel.includes('סבא') ||
    rel.includes('דוד') ||
    rel.includes('אח') ||
    rel === 'אב' ||
    rel.startsWith('אב ')
  ) {
    return 'male';
  }

  const femaleNames = new Set([
    'חיה', 'גולדה', 'גולדא', 'לאה', 'שרה', 'שרלה', "שרל'ה", 'רבקה', 'רחל', 'מרים', 'חנה', 'מלכה', 'בינה', 'עטל',
    'דבורה', 'אסתר', 'פייגא', 'גיטל', 'צפורה', 'ציפורה', 'מרגית', 'רונית', 'בלה', 'פרומה', 'דאברא', 'חאסע',
    'ליבה', 'בריינה', 'שפרינצה', 'שיינדל', 'הינדא', 'הינדע', 'פריידא', 'טויבא', 'מרגלא', 'הענא', 'צירל',
    'איטה', 'קריינדל', 'יוסטא', 'נעכע', 'דרייזל', 'דינה', 'בתיה', 'רחמה', 'רוחמה', 'רוזה', 'שפרה',
    'שפרינצא', 'רייזל', 'פערל', 'מינדל', 'דובריש', 'ביילא', 'רייכלא', 'סלאווה', 'טאבע', 'זלאטא', 'שבע', 'הנציא',
    'יוכבד', 'שושנה', 'בלומא', 'יאכנט', 'סירקה', 'סירקא',
    'Chaya', 'Sara', 'Sarah', 'Golda', 'Leah', 'Rivka', 'Rachel', 'Miriam', 'Chana', 'Malka',
    'Bina', 'Dvora', 'Esther', 'Feiga', 'Gitel', 'Tzipora', 'Bella', 'Fruma', 'Maria', 'Klara',
    'Ruchla', 'Mindla', 'Cyrla', 'Frajdla', 'Rajzla', 'Ita', 'Marjem', 'Toba', 'Dobra', 'Laja',
    'Szajndla', 'Dwojra', 'Sura', 'Hana', 'Rywka', 'Sirke', 'Dreizel', 'Jachent'
  ]);

  const cleanWords = stepName.replace(/["״׳'״()[\].,\-]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of cleanWords) {
    if (femaleNames.has(w)) return 'female';
  }

  return 'male';
}

function getChildConnector(step: LineageStep): 'בן' | 'בת' {
  return (step.gender === 'female' || getStepGender(step) === 'female') ? 'בת' : 'בן';
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
        { gen: 1, name: currentUser?.name || 'בעל היומן', relation: 'אני / בעל היומן', gender: 'male' },
        { gen: person.generation || 2, name: getDeceasedFullName(person), relation: person.relationship || `דור ${person.generation || 2}`, gender: person.gender || 'male' }
      ];

  // Build full chain with "בן/בת":
  const chainSentence = rawPath.map((step, idx) => {
    if (idx === 0) return step.name;
    const prevStep = rawPath[idx - 1];
    const connector = getChildConnector(prevStep);
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
          <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 p-4 rounded-2xl border border-amber-300 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 font-serif">
                <GitCommit className="w-4 h-4 text-amber-700" />
                <span>נוסח הייחוס המלא (בן אחרי בן / בת):</span>
              </div>
              <div className="flex items-center gap-3 text-2xs font-bold font-serif">
                <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>בן (זכר)</span>
                </span>
                <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>בת (נקבה)</span>
                </span>
              </div>
            </div>

            {/* Interactive / visual flow of steps */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1.5 pb-1">
              {rawPath.map((step, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === rawPath.length - 1;
                const prevStep = idx > 0 ? rawPath[idx - 1] : null;
                const isSon = prevStep ? (prevStep.gender === 'male' || getStepGender(prevStep) === 'male') : true;

                return (
                  <React.Fragment key={`banner-${step.gen}-${idx}`}>
                    {prevStep && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight border shadow-none shrink-0 ${
                          isSon
                            ? 'bg-blue-50/80 text-blue-800 border-blue-200/80'
                            : 'bg-rose-50/80 text-rose-800 border-rose-200/80'
                        }`}
                        title={isSon ? 'בן של' : 'בת של'}
                      >
                        <ArrowLeft className={`w-2.5 h-2.5 shrink-0 ${isSon ? 'text-blue-600' : 'text-rose-600'}`} />
                        <span>{isSon ? 'בן של' : 'בת של'}</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-serif shadow-2xs border transition ${
                        isLast
                          ? 'bg-amber-100 text-amber-950 border-amber-400 font-black ring-2 ring-amber-300'
                          : isFirst
                          ? 'bg-blue-50 text-blue-950 border-blue-300 font-bold'
                          : 'bg-white text-slate-800 border-slate-200 font-bold hover:border-slate-300'
                      }`}
                    >
                      <span>{step.name || `פלוני/ת (דור ${step.gen})`}</span>
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
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
              const stepGender = step.gender || getStepGender(step);
              const isSon = stepGender === 'male';

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
                          : isSon
                          ? 'bg-blue-50 text-blue-900 border-2 border-blue-300 group-hover:border-blue-500'
                          : 'bg-rose-50 text-rose-900 border-2 border-rose-300 group-hover:border-rose-500'
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
                          : isSon
                          ? 'bg-white border border-slate-200/90 hover:border-blue-300'
                          : 'bg-white border border-slate-200/90 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md font-serif ${
                            isLast
                              ? 'bg-amber-600 text-white'
                              : isFirst
                              ? 'bg-blue-600 text-white'
                              : isSon
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-rose-100 text-rose-900 border border-rose-200'
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
                              לעילוי נשמת: {formatLeiluyNishmat(person)}
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
                    <div className="flex items-center gap-2 my-1.5 mr-4">
                      <div className={`w-0.5 h-7 ${isSon ? 'bg-blue-400' : 'bg-rose-400'}`} />
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs font-serif border ${
                        isSon
                          ? 'bg-blue-100 text-blue-950 border-blue-300'
                          : 'bg-rose-100 text-rose-950 border-rose-300'
                      }`}>
                        <ArrowDown className={`w-3 h-3 ${isSon ? 'text-blue-700' : 'text-rose-700'}`} />
                        <span>{isSon ? 'בן של' : 'בת של'}</span>
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
