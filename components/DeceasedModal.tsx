'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DeceasedPerson, FamilyBranch } from '@/lib/types';
import {
  HEBREW_MONTHS_LIST,
  HEBREW_TO_HEBCAL_MONTH,
  convertGregorianToHebrew,
  formatDisplayDateWithGregorian,
  formatHebrewDay,
  formatHebrewYear,
  isPersonLiving,
  getSimchaType,
  cleanLivingMarkerFromText,
  getDeceasedFormattedParts,
} from '@/lib/hebrew-calendar';
import { X, Calendar, AlertTriangle, Check, Sunset, Info, Cake, Flame, GitBranch, HeartHandshake, Heart, Sparkles } from 'lucide-react';

interface DeceasedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deceased: Partial<DeceasedPerson>, forceConfirm?: boolean) => Promise<{ conflict?: boolean; message?: string; conflictType?: string } | void>;
  branches: FamilyBranch[];
  initialData?: DeceasedPerson | null;
  calendarId: string;
  defaultIsLiving?: boolean;
  defaultSimchaType?: 'birthday' | 'anniversary' | 'simcha';
  allPeople?: DeceasedPerson[];
}

export const DeceasedModal: React.FC<DeceasedModalProps> = ({
  isOpen,
  onClose,
  onSave,
  branches,
  initialData,
  calendarId,
  defaultIsLiving = false,
  defaultSimchaType = 'birthday',
  allPeople = [],
}) => {
  const [isLiving, setIsLiving] = useState<boolean>(false);
  const [simchaType, setSimchaType] = useState<'birthday' | 'anniversary' | 'simcha'>('birthday');
  const [transitionedFromLiving, setTransitionedFromLiving] = useState<boolean>(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [parentName, setParentName] = useState('');
  const [linkedParentId, setLinkedParentId] = useState<string>('');
  const [lineagePath, setLineagePath] = useState<any[] | undefined>(undefined);
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
      const detectedLiving = isPersonLiving(initialData);
      setIsLiving(detectedLiving);
      setSimchaType(detectedLiving ? getSimchaType(initialData) : 'birthday');
      setTransitionedFromLiving(false);
      setFirstName(initialData.first_name || '');
      setLastName(initialData.last_name || '');
      setParentName(initialData.father_or_mother_name || '');
      setLinkedParentId('');
      setLineagePath(initialData.lineage_path);
      setBranchId(initialData.branch_id || (branches[0]?.id || ''));
      const detectedGender = initialData.gender || (initialData.title === 'מרת' || initialData.title === 'הרבנית' ? 'female' : 'male');
      setGender(detectedGender);
      setTitle(initialData.title ?? (detectedLiving ? '' : detectedGender === 'female' ? 'מרת' : 'ר\''));
      setRelationship(cleanLivingMarkerFromText(initialData.relationship));
      setGeneration(typeof initialData.generation === 'number' ? initialData.generation : detectedLiving ? 1 : 2);
      const isDateValid = Boolean(initialData.hebrew_day && initialData.hebrew_month);
      setHasConfirmedDate(isDateValid);
      setHebrewDay(initialData.hebrew_day || 1);
      const rawMonth = initialData.hebrew_month || 'Nisan';
      setHebrewMonth(HEBREW_TO_HEBCAL_MONTH[rawMonth] || rawMonth);
      setHebrewYear(initialData.hebrew_year || 5780);
      setGregorianDate(initialData.gregorian_original_date || '');
      setAfterSunset(initialData.after_sunset || false);
      setLeapPreference(initialData.leap_year_preference || 'Adar II');
      setNotes(cleanLivingMarkerFromText(initialData.notes));
      setDateMode(initialData.gregorian_original_date ? 'gregorian' : 'hebrew');
    } else {
      setIsLiving(Boolean(defaultIsLiving));
      setSimchaType(defaultSimchaType || 'birthday');
      setTransitionedFromLiving(false);
      setFirstName('');
      setLastName('');
      setParentName('');
      setLinkedParentId('');
      setLineagePath(undefined);
      setBranchId(branches[0]?.id || '');
      setGender('male');
      setTitle(defaultIsLiving ? '' : 'ר\'');
      setRelationship(defaultSimchaType === 'anniversary' ? 'יום נישואין' : '');
      setGeneration(defaultIsLiving ? 1 : 2);
      setHasConfirmedDate(true);
      setHebrewDay(1);
      setHebrewMonth('Nisan');
      setHebrewYear(defaultIsLiving ? 5765 : 5780);
      setGregorianDate('');
      setAfterSunset(false);
      setLeapPreference('Adar II');
      setNotes('');
      setDateMode('hebrew');
    }
    setConflictData(null);
  }, [initialData, branches, isOpen, defaultIsLiving, defaultSimchaType]);

  // Handle switching between Living and Deceased mode for new records
  const handlePersonModeSwitch = (targetLiving: boolean, targetSimchaType?: 'birthday' | 'anniversary' | 'simcha') => {
    if (initialData && isPersonLiving(initialData) && !targetLiving) {
      handleTransitionLivingToDeceased();
      return;
    }
    setIsLiving(targetLiving);
    if (targetSimchaType) {
      setSimchaType(targetSimchaType);
    }
    if (!initialData) {
      if (targetLiving) {
        setTitle('');
        if (generation === 2) setGeneration(1);
      } else {
        setTitle(gender === 'female' ? 'מרת' : 'ר\'');
        if (generation <= 1) setGeneration(2);
      }
    }
  };

  // Seamless transition from Living (Hebrew Birthday) to Deceased (Yahrzeit), G-d forbid
  const handleTransitionLivingToDeceased = () => {
    const birthDateFormatted = hasConfirmedDate
      ? formatDisplayDateWithGregorian(hebrewDay, hebrewMonth, hebrewYear, gregorianDate || undefined)
      : '';
    const birthArchiveNote = birthDateFormatted ? `תאריך לידה עברי: ${birthDateFormatted}` : '';

    setNotes((prev) => {
      const cleaned = cleanLivingMarkerFromText(prev);
      if (birthArchiveNote && !cleaned.includes('תאריך לידה')) {
        return cleaned ? `${birthArchiveNote} | ${cleaned}` : birthArchiveNote;
      }
      return cleaned;
    });

    setIsLiving(false);
    setTransitionedFromLiving(true);
    if (!title) {
      setTitle(gender === 'female' ? 'מרת' : 'ר\'');
    }
    // Set default passing date to current year so user can enter the passing date
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayIso = `${yyyy}-${mm}-${dd}`;
    setGregorianDate(todayIso);
    try {
      const conv = convertGregorianToHebrew(todayIso, false);
      setHebrewDay(conv.hebrew_day);
      setHebrewMonth(conv.hebrew_month);
      setHebrewYear(conv.hebrew_year);
    } catch {
      // ignore
    }
  };

  // Handle gender change to auto-set default title
  const handleGenderChange = (newGender: 'male' | 'female') => {
    setGender(newGender);
    if (!isLiving) {
      if (newGender === 'male' && (title === 'מרת' || title === 'הרבנית' || !title)) {
        setTitle('ר\'');
      } else if (newGender === 'female' && (title === 'ר\'' || title === 'אדמו"ר' || title === 'אדמו״ר' || title === 'הגאון רבי' || !title)) {
        setTitle('מרת');
      }
    }
  };

  // Handle selecting an existing parent in the family tree to build the tree onwards
  const handleSelectParentFromTree = (parentId: string) => {
    setLinkedParentId(parentId);
    if (!parentId) return;
    const parent = allPeople.find((p) => p.id === parentId);
    if (!parent) return;

    const parts = getDeceasedFormattedParts(parent);
    const parentDisplay = `${parts.showTitle ? parts.cleanTitle + ' ' : ''}${parts.cleanFirstName} ${parts.cleanLastName}`.trim();
    const connector = gender === 'female' ? 'בת' : 'בן';
    setParentName(`${connector} ${parentDisplay}`);

    if (parent.branch_id) {
      setBranchId(parent.branch_id);
    }
    if (!lastName.trim() && parent.last_name) {
      setLastName(parent.last_name);
    }

    const parentGen = typeof parent.generation === 'number' ? parent.generation : 2;
    const childGen = parentGen - 1;
    setGeneration(childGen);

    // Build lineage_path connecting to parent
    const parentLineage = Array.isArray(parent.lineage_path) ? [...parent.lineage_path] : [];
    const parentNodeName = `${parent.first_name} ${parent.last_name}`.trim();
    const alreadyInLineage = parentLineage.some(
      (step: any) => String(step?.name || '').includes(parent.first_name)
    );
    const updatedLineage = alreadyInLineage
      ? parentLineage
      : [
          ...parentLineage,
          {
            gen: parentGen,
            name: parentNodeName,
            gender: parent.gender || 'male',
            relation: parent.relationship ? cleanLivingMarkerFromText(parent.relationship) : 'הורה',
          },
        ];
    setLineagePath(updatedLineage);
  };

  // Candidates for parent selection sorted by generation
  const parentCandidates = useMemo(() => {
    return allPeople
      .filter((p) => !initialData || p.id !== initialData.id)
      .sort((a, b) => (a.generation ?? 2) - (b.generation ?? 2));
  }, [allPeople, initialData]);

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
      alert('נא למלא שם, שם משפחה ולבחור ענף משפחתי.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanRel = cleanLivingMarkerFromText(relationship);
      const simchaTag =
        isLiving && simchaType === 'anniversary'
          ? '[יום נישואין]'
          : isLiving && simchaType === 'simcha'
          ? '[שמחה]'
          : '';
      const defaultLivingRel =
        simchaType === 'anniversary'
          ? 'יום נישואין'
          : simchaType === 'simcha'
          ? 'שמחה משפחתית'
          : 'בן/בת משפחה';
      const finalRelationship = isLiving
        ? `[בחיים]${simchaTag} ${cleanRel || defaultLivingRel}`
        : cleanRel || undefined;

      const payload: Partial<DeceasedPerson> = {
        ...(initialData ? { id: initialData.id } : {}),
        calendar_id: calendarId,
        branch_id: branchId,
        title: title.trim() || undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        father_or_mother_name: parentName.trim() || undefined,
        gender,
        generation: typeof generation === 'number' && !isNaN(generation) ? generation : isLiving ? 1 : 2,
        relationship: finalRelationship,
        hebrew_day: hasConfirmedDate ? hebrewDay : null,
        hebrew_month: hasConfirmedDate ? hebrewMonth : null,
        hebrew_year: hasConfirmedDate ? hebrewYear : null,
        gregorian_original_date: hasConfirmedDate && gregorianDate ? gregorianDate : undefined,
        after_sunset: hasConfirmedDate ? afterSunset : false,
        leap_year_preference: leapPreference,
        notes: cleanLivingMarkerFromText(notes) || undefined,
        is_living: isLiving,
        simcha_type: isLiving ? simchaType : undefined,
        ...(lineagePath ? { lineage_path: lineagePath } : {}),
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
        <div
          className={`text-white px-6 py-4 flex items-center justify-between ${
            isLiving
              ? 'bg-gradient-to-l from-emerald-900 via-teal-800 to-slate-900'
              : 'bg-gradient-to-l from-slate-900 to-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isLiving ? (
              simchaType === 'anniversary' ? (
                <Heart className="w-5 h-5 text-pink-300" />
              ) : simchaType === 'simcha' ? (
                <Sparkles className="w-5 h-5 text-amber-300" />
              ) : (
                <Cake className="w-5 h-5 text-emerald-300" />
              )
            ) : (
              <Calendar className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="text-lg font-bold">
              {initialData
                ? isLiving
                  ? simchaType === 'anniversary'
                    ? 'עריכת יום נישואין עברי'
                    : simchaType === 'simcha'
                    ? 'עריכת שמחה משפחתית'
                    : 'עריכת בן/בת משפחה בחיים (יום הולדת עברי)'
                  : transitionedFromLiving
                  ? 'עדכון פטירה ח״ו ושמירת מיקום בעץ המשפחה'
                  : 'עריכת פרטי נפטר/ת'
                : isLiving
                ? simchaType === 'anniversary'
                  ? 'הוספת יום נישואין עברי ללוח השמחות'
                  : simchaType === 'simcha'
                  ? 'הוספת שמחה משפחתית ללוח השמחות'
                  : 'הוספת יום הולדת עברי (בן/בת משפחה בחיים)'
                : 'הוספת נפטר/ת ליומן המשפחתי'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Mode Switcher: Deceased (Yahrzeit) vs Living (Hebrew Birthday / Anniversary / Simcha) */}
          <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handlePersonModeSwitch(false)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isLiving
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>ממשק ימי זיכרון • יום פטירה (יארצייט)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePersonModeSwitch(true, simchaType)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                isLiving
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>ממשק שמחות • ימי הולדת וימי נישואין</span>
            </button>
          </div>

          {/* Sub-type selector when in Simchas / Living mode */}
          {isLiving && (
            <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/90 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSimchaType('birthday');
                  if (relationship === 'יום נישואין' || relationship === 'שמחה משפחתית') {
                    setRelationship('');
                  }
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  simchaType === 'birthday'
                    ? 'bg-white text-emerald-900 shadow-xs ring-1 ring-emerald-300'
                    : 'text-emerald-800 hover:bg-white/60'
                }`}
              >
                <span>🎂 יום הולדת עברי</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimchaType('anniversary');
                  if (!relationship) setRelationship('יום נישואין');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  simchaType === 'anniversary'
                    ? 'bg-white text-pink-900 shadow-xs ring-1 ring-pink-300'
                    : 'text-emerald-800 hover:bg-white/60'
                }`}
              >
                <span>💍 יום נישואין עברי</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimchaType('simcha');
                  if (!relationship || relationship === 'יום נישואין') setRelationship('שמחה משפחתית');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  simchaType === 'simcha'
                    ? 'bg-white text-amber-900 shadow-xs ring-1 ring-amber-300'
                    : 'text-emerald-800 hover:bg-white/60'
                }`}
              >
                <span>🥂 שמחה משפחתית</span>
              </button>
            </div>
          )}

          {/* Seamless Transition Banner when editing a living person */}
          {initialData && isPersonLiving(initialData) && isLiving && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">
                  🌱 שמירת רציפות עץ המשפחה לאורך דורות
                </span>
                דמות זו רשומה כעת בחיים. במקרה של פטירה ח״ו, ניתן להעביר את הרשומה למצב יארצייט בלחיצה אחת — תאריך הלידה יישמר בהערות וכל הצאצאים והחיבורים בעץ יישארו מחוברים.
              </div>
              <button
                type="button"
                onClick={handleTransitionLivingToDeceased}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-700" />
                <span>מעבר למצב פטירה ח״ו</span>
              </button>
            </div>
          )}

          {transitionedFromLiving && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
              <HeartHandshake className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">הרשומה הועברה למצב ציון יום פטירה (יארצייט)</span>
                תאריך הלידה העברי נשמר אוטומטית בשדה ההערות, ומיקום הדמות בעץ המשפחה (יחד עם כל הצאצאים המקושרים אליה) נשמר במלואו. כעת הזן את תאריך הפטירה ולחץ על שמירה.
              </div>
            </div>
          )}

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

          {/* Gender & Title & Generation Section */}
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
                  {isLiving ? 'זכר (בן)' : 'גבר (ר׳)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderChange('female')}
                  className={`flex-1 py-1.5 rounded-md transition text-center ${
                    gender === 'female' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isLiving ? 'נקבה (בת)' : 'אישה (מרת)'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                תואר / קידומת שם
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {gender === 'male' ? (
                  <>
                    <option value="">ללא תואר</option>
                    <option value="ר׳">ר׳</option>
                    <option value="הרב">הרב</option>
                    <option value="הגאון רבי">הגאון רבי</option>
                    <option value="אדמו״ר">אדמו״ר</option>
                  </>
                ) : (
                  <>
                    <option value="">ללא תואר</option>
                    <option value="מרת">מרת</option>
                    <option value="הרבנית">הרבנית</option>
                    <option value="העלמה">העלמה</option>
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
                <option value={-2}>דור -2 • נינים (דור רביעי)</option>
                <option value={-1}>דור -1 • נכדים (דור שלישי)</option>
                <option value={0}>דור 0 • ילדים (דור ההמשך)</option>
                <option value={1}>דור 1 • הדור שלי / אחים / בני דודים</option>
                <option value={2}>דור 2 • הורים ודודים</option>
                <option value={3}>דור 3 • סבים, סבתות ואחיהם</option>
                <option value={4}>דור 4 • סבא-רבא / סבתא-רבתא ואחיהם</option>
                <option value={5}>דור 5 • סבא-רבא-רבא</option>
                <option value={6}>דור 6 • אבות קדמונים</option>
                <option value={7}>דור 7 • אבות קדמונים</option>
                <option value={8}>דור 8 • אבות קדמונים</option>
              </select>
            </div>
          </div>

          {/* Names Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isLiving && simchaType === 'anniversary'
                  ? 'שמות בני הזוג'
                  : isLiving && simchaType === 'simcha'
                  ? 'שם בעל/ת השמחה או האירוע'
                  : 'שם פרטי'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  isLiving && simchaType === 'anniversary'
                    ? 'למשל: דוד ורחל'
                    : isLiving && simchaType === 'simcha'
                    ? 'למשל: אברהם (או: חנוכת הבית)'
                    : 'למשל: ישראל מאיר'
                }
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
                placeholder="למשל: ישראלי"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Tree Parent Linker (for building the family tree onwards) */}
          {parentCandidates.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                <span>חיבור לעץ המשפחה — בחר הורה מתוך האילן (אופציונלי, לבניית העץ הלאה):</span>
              </div>
              <select
                value={linkedParentId}
                onChange={(e) => handleSelectParentFromTree(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="">-- הזנה ידנית של שם ההורה (ללא קישור אוטומטי מהרשימה) --</option>
                {parentCandidates.map((p) => {
                  const pLiving = isPersonLiving(p);
                  const parts = getDeceasedFormattedParts(p);
                  return (
                    <option key={p.id} value={p.id}>
                      {parts.fullName} {pLiving ? '(בחיים 🎂)' : '(ז״ל)'} — דור {p.generation ?? 2}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-emerald-800">
                בחירת הורה מתוך העץ תמלא אוטומטית את השיוך לענף, הדור באילן ושרשרת היוחסין — כך שהעץ ייבנה הלאה לדורות הבאים.
              </p>
            </div>
          )}

          {/* Relationship & Parent Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isLiving
                  ? simchaType === 'anniversary'
                    ? 'תיאור הקרבה (למשל: הורים, סבא וסבתא, אח ואשתו)'
                    : 'קרבה משפחתית (למשל: בן, בת, אח, נכד, אבא)'
                  : 'קרבה לבעל היומן (למשל: אם, סבא מצד אב)'}
              </label>
              <input
                type="text"
                placeholder={
                  isLiving
                    ? simchaType === 'anniversary'
                      ? 'למשל: הורים, סבא וסבתא, אח וגיסה'
                      : 'למשל: בן, בת, אח, אחות, נכד, בת דודה'
                    : 'למשל: אם, סבא מצד אב, אחות סבתא'
                }
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isLiving
                  ? 'בן/בת מי (שם האב או האם לחיבור בעץ)'
                  : 'בן/בת (שם האב או האם לעילוי נשמה)'}
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
          <div
            className={`rounded-xl p-3.5 flex items-center justify-between border ${
              isLiving
                ? simchaType === 'anniversary'
                  ? 'bg-pink-500/10 border-pink-300/80'
                  : 'bg-emerald-500/10 border-emerald-300/80'
                : 'bg-amber-500/10 border-amber-300/80'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-slate-900">
                {isLiving
                  ? simchaType === 'anniversary'
                    ? 'האם ידוע תאריך הנישואין העברי / הלועזי?'
                    : simchaType === 'simcha'
                    ? 'האם ידוע תאריך השמחה העברי / הלועזי?'
                    : 'האם ידוע תאריך הלידה העברי / הלועזי?'
                  : 'האם יש תאריך פטירה מאומת?'}
              </div>
              <div className="text-2xs text-slate-500">
                {hasConfirmedDate
                  ? isLiving
                    ? 'התאריך העברי יחושב מדי שנה ויופיע בממשק השמחות, בעץ המשפחה וביומן השמחות.'
                    : 'התאריך יוזן כעת ויופיע בלוח השנה ובסנכרון השנתי (מצאת הכוכבים עד השקיעה).'
                  : 'הדמות תישמר באילן היוחסין להשלמת התאריך בעתיד.'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfirmedDate}
                onChange={(e) => setHasConfirmedDate(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  isLiving ? 'peer-checked:bg-emerald-600' : 'peer-checked:bg-amber-600'
                }`}
              ></div>
            </label>
          </div>

          {/* Date Entry Mode Selector */}
          {hasConfirmedDate && (
            <>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {isLiving
                      ? simchaType === 'anniversary'
                        ? 'שיטת הזנת תאריך הנישואין:'
                        : simchaType === 'simcha'
                        ? 'שיטת הזנת תאריך השמחה:'
                        : 'שיטת הזנת תאריך הלידה:'
                      : 'שיטת הזנת תאריך הפטירה:'}
                  </span>
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
                      הזנה לפי תאריך לועזי (המרה אוטומטית)
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
                      <label className="block text-xs text-slate-600 mb-1">
                        {isLiving
                          ? simchaType === 'anniversary'
                            ? 'שנת נישואין עברית'
                            : simchaType === 'simcha'
                            ? 'שנת האירוע העברית'
                            : 'שנת לידה עברית'
                          : 'שנת פטירה עברית'}
                      </label>
                      <input
                        type="number"
                        min="5500"
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
                          {isLiving
                            ? simchaType === 'anniversary'
                              ? 'תאריך נישואין לועזי'
                              : simchaType === 'simcha'
                              ? 'תאריך האירוע הלועזי'
                              : 'תאריך לידה לועזי'
                            : 'תאריך פטירה לועזי מקורי'}
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
                            <span>
                              {isLiving
                                ? simchaType === 'anniversary'
                                  ? 'החופה התרחשה לאחר השקיעה / בערב'
                                  : 'האירוע/הלידה התרחשו לאחר השקיעה / בערב'
                                : 'הפטירה התרחשה לאחר השקיעה / בצאת הכוכבים'}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      לפי ההלכה, יום עברי מתחלף עם שקיעת החמה. אם {isLiving ? (simchaType === 'anniversary' ? 'החופה' : 'הלידה/השמחה') : 'הפטירה'} הייתה בערב/לילה, התאריך העברי מחושב ליום הבא.
                    </p>
                  </div>
                )}

                {/* Required Format Preview: Hebrew Primary, Gregorian in Parentheses */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900">
                    {isLiving
                      ? simchaType === 'anniversary'
                        ? 'תאריך יום הנישואין העברי:'
                        : simchaType === 'simcha'
                        ? 'תאריך השמחה העברי:'
                        : 'תאריך יום ההולדת העברי:'
                      : 'תבנית הצגת התאריך הרשמית:'}
                  </span>
                  <span className="text-sm font-bold text-blue-950 bg-white px-3 py-1 rounded-md border border-blue-200 shadow-sm">
                    {previewDate}
                  </span>
                </div>
              </div>

              {/* Leap Year Rule for Adar */}
              {(hebrewMonth === 'Adar' || hebrewMonth === 'Adar I' || hebrewMonth === 'Adar II') && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isLiving
                      ? 'ציון השמחה / יום ההולדת בשנה מעוברת (שבה יש שני חודשי אדר):'
                      : 'מנהג בציון יום השנה בשנה מעוברת (שבה יש שני חודשי אדר):'}
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
              {isLiving ? 'הערות ופרטים נוספים' : 'הערות, מנהגים ומקום קבורה'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isLiving
                  ? simchaType === 'anniversary'
                    ? 'למשל: התחתנו בירושלים, פרטים על המשפחה...'
                    : 'למשל: נולד בירושלים, פרטים על המשפחה...'
                  : 'למשל: קבור בחלקת חב״ד בהר הזיתים, נהג לתת צדקה ביום זה, לומר קדיש...'
              }
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
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition shadow disabled:opacity-50 ${
              isLiving
                ? simchaType === 'anniversary'
                  ? 'bg-pink-600 hover:bg-pink-700'
                  : simchaType === 'simcha'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {initialData
                ? 'שמור שינויים'
                : isLiving
                ? simchaType === 'anniversary'
                  ? 'הוסף יום נישואין ללוח השמחות'
                  : simchaType === 'simcha'
                  ? 'הוסף שמחה משפחתית ללוח'
                  : 'הוסף יום הולדת עברי לעץ'
                : 'הוסף נפטר ליומן'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
