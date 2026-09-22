'use client';

import React, { useState, useEffect } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  HEBREW_MONTHS_LIST,
  convertGregorianToHebrew,
  formatDisplayDateWithGregorian,
  formatHebrewDay,
  formatHebrewYear,
} from '@/lib/hebrew-calendar';
import { X, Calendar, AlertTriangle, Check, Sunset, Moon, Info } from 'lucide-react';

interface DeceasedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deceased: Partial<DeceasedPerson>, forceConfirm?: boolean) => Promise<{ conflict?: boolean; message?: string; conflictType?: string } | void>;
  branches: FamilyBranch[];
  initialData?: DeceasedPerson | null;
  calendarId: string;
}

export const DeceasedModal: React.FC<DeceasedModalProps> = ({
  isOpen,
  onClose,
  onSave,
  branches,
  initialData,
  calendarId,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [parentName, setParentName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [title, setTitle] = useState('ר\'');
  const [relationship, setRelationship] = useState('');
  const [generation, setGeneration] = useState(2);
  const [hasConfirmedDate, setHasConfirmedDate] = useState(true);

  // Date input mode: 'hebrew' or 'gregorian'
  const [dateMode, setDateMode] = useState<'hebrew' | 'gregorian'>('hebrew');

  // Hebrew date fields
  const [hebrewDay, setHebrewDay] = useState(1);
  const [hebrewMonth, setHebrewMonth] = useState('Nisan');
  const [hebrewYear, setHebrewYear] = useState(5780);

  // Gregorian date fields
  const [gregorianDate, setGregorianDate] = useState('');
  const [afterSunset, setAfterSunset] = useState(false);

  // Preferences & Notes
  const [leapPreference, setLeapPreference] = useState<'Adar II' | 'Adar I' | 'both'>('Adar II');
  const [notes, setNotes] = useState('');

  // Conflict Warning State
  const [conflictData, setConflictData] = useState<{ message: string; type: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.first_name || '');
      setLastName(initialData.last_name || '');
      setParentName(initialData.father_or_mother_name || '');
      setBranchId(initialData.branch_id || (branches[0]?.id || ''));
      const detectedGender = initialData.gender || (initialData.title === 'מרת' || initialData.title === 'הרבנית' ? 'female' : 'male');
      setGender(detectedGender);
      setTitle(initialData.title || (detectedGender === 'female' ? 'מרת' : 'ר\''));
      setRelationship(initialData.relationship || '');
      setGeneration(initialData.generation || 2);
      const isDateValid = Boolean(initialData.hebrew_day && initialData.hebrew_month);
      setHasConfirmedDate(isDateValid);
      setHebrewDay(initialData.hebrew_day || 1);
      setHebrewMonth(initialData.hebrew_month || 'Nisan');
      setHebrewYear(initialData.hebrew_year || 5780);
      setGregorianDate(initialData.gregorian_original_date || '');
      setAfterSunset(initialData.after_sunset || false);
      setLeapPreference(initialData.leap_year_preference || 'Adar II');
      setNotes(initialData.notes || '');
      setDateMode(initialData.gregorian_original_date ? 'gregorian' : 'hebrew');
    } else {
      setFirstName('');
      setLastName('');
      setParentName('');
      setBranchId(branches[0]?.id || '');
      setGender('male');
      setTitle('ר\'');
      setRelationship('');
      setGeneration(2);
      setHasConfirmedDate(true);
      setHebrewDay(1);
      setHebrewMonth('Nisan');
      setHebrewYear(5780);
      setGregorianDate('');
      setAfterSunset(false);
      setLeapPreference('Adar II');
      setNotes('');
      setDateMode('hebrew');
    }
    setConflictData(null);
  }, [initialData, branches, isOpen]);

  // Handle gender change to auto-set default title
  const handleGenderChange = (newGender: 'male' | 'female') => {
    setGender(newGender);
    if (newGender === 'male' && (title === 'מרת' || title === 'הרבנית' || !title)) {
      setTitle('ר\'');
    } else if (newGender === 'female' && (title === 'ר\'' || title === 'הרה"ח ר\'' || title === 'הגאון רבי' || !title)) {
      setTitle('מרת');
    }
  };

  // When Gregorian date or afterSunset changes in Gregorian mode, auto-compute Hebrew date
  useEffect(() => {
    if (dateMode === 'gregorian' && gregorianDate) {
      try {
        const converted = convertGregorianToHebrew(gregorianDate, afterSunset);
        setHebrewDay(converted.hebrew_day);
        setHebrewMonth(converted.hebrew_month);
        setHebrewYear(converted.hebrew_year);
      } catch (err) {
        console.error('Error converting date:', err);
      }
    }
  }, [gregorianDate, afterSunset, dateMode]);

  if (!isOpen) return null;

  const handleSubmit = async (force: boolean = false) => {
    if (!firstName.trim() || !lastName.trim() || !branchId) {
      alert('נא למלא שם פרטי, שם משפחה ולבחור ענף משפחתי.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<DeceasedPerson> = {
        ...(initialData ? { id: initialData.id } : {}),
        calendar_id: calendarId,
        branch_id: branchId,
        title: title.trim() || undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        father_or_mother_name: parentName.trim() || undefined,
        gender,
        generation: Number(generation) || 2,
        relationship: relationship.trim() || undefined,
        hebrew_day: hasConfirmedDate ? hebrewDay : null,
        hebrew_month: hasConfirmedDate ? hebrewMonth : null,
        hebrew_year: hasConfirmedDate ? hebrewYear : null,
        gregorian_original_date: (hasConfirmedDate && gregorianDate) ? gregorianDate : undefined,
        after_sunset: hasConfirmedDate ? afterSunset : false,
        leap_year_preference: leapPreference,
        notes: notes.trim() || undefined,
      };

      const res = await onSave(payload, force);
      if (res && res.conflict) {
        setConflictData({ message: res.message || '', type: res.conflictType || 'discrepancy' });
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewDate = formatDisplayDateWithGregorian(
    hebrewDay,
    hebrewMonth,
    hebrewYear,
    gregorianDate || undefined
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">
              {initialData ? 'עריכת פרטי נפטר' : 'הוספת נפטר/ת ליומן המשפחתי'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Conflict Warning Box */}
          {conflictData && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm font-medium leading-relaxed">
                  <p className="font-bold text-amber-950 mb-1">
                    {conflictData.type === 'duplicate'
                      ? 'נמצאה רשומה זהה'
                      : 'התראת אי-התאמה בתאריך'}
                  </p>
                  <p>{conflictData.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setConflictData(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  חזור לעריכה
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm"
                >
                  אשר בכל זאת ושמור
                </button>
              </div>
            </div>
          )}

          {/* Gender & Title Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                מגדר <span className="text-red-500">*</span>
              </label>
              <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleGenderChange('male')}
                  className={`flex-1 py-1.5 rounded-md transition text-center ${
                    gender === 'male' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  גבר (ר׳)
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderChange('female')}
                  className={`flex-1 py-1.5 rounded-md transition text-center ${
                    gender === 'female' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  אישה (מרת)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                תואר כבוד
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {gender === 'male' ? (
                  <>
                    <option value="ר׳">ר׳</option>
                    <option value="הרה״ח ר׳">הרה״ח ר׳</option>
                    <option value="הגאון רבי">הגאון רבי</option>
                    <option value="הרב">הרב</option>
                    <option value="">ללא תואר</option>
                  </>
                ) : (
                  <>
                    <option value="מרת">מרת</option>
                    <option value="הרבנית">הרבנית</option>
                    <option value="העלמה">העלמה</option>
                    <option value="">ללא תואר</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                דור באילן המשפחה
              </label>
              <select
                value={generation}
                onChange={(e) => setGeneration(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={1}>דור 1 • הורים</option>
                <option value={2}>דור 2 • סבים, סבתות, דודים</option>
                <option value={3}>דור 3 • סבא-רבא / סבתא-רבתא</option>
                <option value={4}>דור 4 • סבא-רבא-רבא</option>
                <option value={5}>דור 5 • אבות קדמונים</option>
                <option value={6}>דור 6 • אבות קדמונים</option>
                <option value={7}>דור 7 • אבות קדמונים</option>
              </select>
            </div>
          </div>

          {/* Names Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                שם פרטי <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="למשל: עמנואל נתן"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                שם משפחה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="למשל: רייכקינד"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Relationship & Parent Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                קרבה לבעל היומן (למשל: אם, סבא מצד אב)
              </label>
              <input
                type="text"
                placeholder="למשל: אם, סבא מצד אב, אחות סבתא"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                בן/בת (שם האב או האם לעילוי נשמה)
              </label>
              <input
                type="text"
                placeholder="למשל: בן רבי זאב וואלף ובינה"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Branch Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              שיוך לענף משפחתי <span className="text-red-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Has Confirmed Date Toggle */}
          <div className="bg-amber-500/10 border border-amber-300/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">האם יש תאריך פטירה מאומת?</div>
              <div className="text-2xs text-slate-500">
                {hasConfirmedDate 
                  ? 'התאריך יוזן כעת ויופיע בלוח השנה ובסנכרון השנתי.' 
                  : 'הדמות תישמר באילן היוחסין ותופיע ברובריקת ״ללא תאריך״ להשלמה עתידית.'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfirmedDate}
                onChange={(e) => setHasConfirmedDate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Date Entry Mode Selector (Shown only if hasConfirmedDate is true) */}
          {hasConfirmedDate && (
            <>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">שיטת הזנת תאריך הפטירה:</span>
              <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateMode('hebrew')}
                  className={`px-3 py-1 rounded-md transition ${
                    dateMode === 'hebrew'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  תאריך עברי ישיר
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('gregorian')}
                  className={`px-3 py-1 rounded-md transition ${
                    dateMode === 'gregorian'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  הזנה לפי תאריך לועזי
                </button>
              </div>
            </div>

            {/* Mode A: Direct Hebrew Date */}
            {dateMode === 'hebrew' ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">יום בחודש העברי</label>
                  <select
                    value={hebrewDay}
                    onChange={(e) => setHebrewDay(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {formatHebrewDay(d)} ({d})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">חודש עברי</label>
                  <select
                    value={hebrewMonth}
                    onChange={(e) => setHebrewMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {HEBREW_MONTHS_LIST.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">שנה עברית</label>
                  <input
                    type="number"
                    min="5600"
                    max="5850"
                    value={hebrewYear}
                    onChange={(e) => setHebrewYear(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    ({formatHebrewYear(hebrewYear)})
                  </span>
                </div>
              </div>
            ) : (
              /* Mode B: Gregorian with Sunset Checkbox */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      תאריך פטירה לועזי מקורי
                    </label>
                    <input
                      type="date"
                      value={gregorianDate}
                      onChange={(e) => setGregorianDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="relative flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition">
                      <input
                        type="checkbox"
                        checked={afterSunset}
                        onChange={(e) => setAfterSunset(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-amber-950 font-medium">
                        <Sunset className="w-4 h-4 text-amber-600" />
                        <span>הפטירה התרחשה לאחר השקיעה / בצאת הכוכבים</span>
                      </div>
                    </label>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  לפי ההלכה, יום עברי מתחלף עם שקיעת החמה. אם הפטירה הייתה בלילה, התאריך העברי מחושב ליום הבא.
                </p>
              </div>
            )}

            {/* Required Format Preview: Hebrew Primary, Gregorian in Parentheses */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-medium text-blue-900">תבנית הצגת התאריך הרשמית:</span>
              <span className="text-sm font-bold text-blue-950 bg-white px-3 py-1 rounded-md border border-blue-200 shadow-sm">
                {previewDate}
              </span>
            </div>
          </div>

          {/* Leap Year Rule for Adar */}
          {(hebrewMonth === 'Adar' || hebrewMonth === 'Adar I' || hebrewMonth === 'Adar II') && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                מנהג בציון יום השנה בשנה מעוברת (שבה יש שני חודשי אדר):
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="leapPref"
                    value="Adar II"
                    checked={leapPreference === 'Adar II'}
                    onChange={() => setLeapPreference('Adar II')}
                  />
                  <span>אדר ב׳ (מנהג עיקרי / שו״ע)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="leapPref"
                    value="Adar I"
                    checked={leapPreference === 'Adar I'}
                    onChange={() => setLeapPreference('Adar I')}
                  />
                  <span>אדר א׳</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="leapPref"
                    value="both"
                    checked={leapPreference === 'both'}
                    onChange={() => setLeapPreference('both')}
                  />
                  <span>בשני החודשים</span>
                </label>
              </div>
            </div>
          )}
          </>
        )}

          {/* Notes & Customs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              הערות, מנהגים ומקום קבורה
            </label>
            <textarea
              rows={2}
              placeholder="למשל: קבור בחלקת חב״ד בהר הזיתים, נהג לתת צדקה ביום זה, לומר קדיש..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            ביטול
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{initialData ? 'שמור שינויים' : 'הוסף נפטר ליומן'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
