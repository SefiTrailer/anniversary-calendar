'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HEBREW_CALENDAR_CITIES,
  SELECTABLE_ZMANIM_OPTIONS,
  DEFAULT_HEBREW_CALENDAR_OPTIONS,
  HebrewCalendarFeedOptions,
  ZmanimKey,
  ZmanimDisplayMode,
  buildHebrewCalendarQueryParams,
  getDefaultHebrewCalendarDisplayName,
  getHebrewCalendarLivePreview,
  getCityConfig,
  computeDailyZmanimForDate,
} from '@/lib/hebrew-dates-calendar';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Download,
  Flame,
  Sun,
  BookOpen,
  RotateCcw,
  Edit3,
  HelpCircle,
} from 'lucide-react';

interface HebrewCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'ner_neshama_hebrew_cal_prefs_v1';

const QUICK_CITY_IDS = ['jerusalem', 'bnei_brak', 'tel_aviv', 'haifa', 'modiin', 'beer_sheva'];

export const HebrewCalendarSyncModal: React.FC<HebrewCalendarSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [options, setOptions] = useState<HebrewCalendarFeedOptions>(DEFAULT_HEBREW_CALENDAR_OPTIONS);
  const [origin, setOrigin] = useState('https://family-zmanim.vercel.app');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setOptions((prev) => ({
              ...prev,
              ...parsed,
              zmanim: Array.isArray(parsed.zmanim) ? parsed.zmanim : prev.zmanim,
            }));
          }
        }
      } catch {}
    }
  }, [isOpen]);

  // Save preferences to localStorage whenever options change
  const updateOptions = (patch: Partial<HebrewCalendarFeedOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const cityConfig = useMemo(() => getCityConfig(options.city), [options.city]);

  // Compute all zmanim for today in the selected city so each chip displays today's live time
  const allTodayZmanimMap = useMemo(() => {
    const allKeys = SELECTABLE_ZMANIM_OPTIONS.map((z) => z.id);
    const computed = computeDailyZmanimForDate(new Date(), cityConfig, allKeys);
    const map = new Map<ZmanimKey, string>();
    for (const item of computed) {
      map.set(item.id, item.timeStr);
    }
    return map;
  }, [cityConfig]);

  // Compute live preview based on current options
  const livePreview = useMemo(() => getHebrewCalendarLivePreview(options), [options]);

  const defaultCalName = useMemo(
    () => `לוח עברי, שבתות וזמנים (${cityConfig.name})`,
    [cityConfig.name]
  );

  const feedUrls = useMemo(() => {
    const params = buildHebrewCalendarQueryParams(options);
    const qs = params.toString();
    const https = `${origin}/api/calendar/hebrew.ics?${qs}`;
    const webcal = `${origin.replace(/^https?:/, 'webcal:')}/api/calendar/hebrew.ics?${qs}`;
    const googleSub = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
    return { https, webcal, googleSub };
  }, [options, origin]);

  if (!isOpen) return null;

  const toggleZman = (key: ZmanimKey) => {
    const exists = options.zmanim.includes(key);
    const nextZmanim = exists
      ? options.zmanim.filter((k) => k !== key)
      : SELECTABLE_ZMANIM_OPTIONS.map((o) => o.id).filter(
          (id) => id === key || options.zmanim.includes(id)
        );
    updateOptions({ zmanim: nextZmanim });
  };

  const selectRecommendedZmanim = () => {
    updateOptions({
      zmanim: ['sunrise', 'szksGra', 'sztGra', 'sunset', 'tzeit'],
    });
  };

  const selectAllZmanim = () => {
    updateOptions({
      zmanim: SELECTABLE_ZMANIM_OPTIONS.map((z) => z.id),
    });
  };

  const clearAllZmanim = () => {
    updateOptions({ zmanim: [] });
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(feedUrls.https);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 w-full max-w-4xl my-6 overflow-hidden">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-l from-purple-900 via-indigo-900 to-slate-900 text-white px-5 py-4 sm:px-7 sm:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black font-serif tracking-tight">
                  הוספת יומן תאריך עברי, שבתות, חגים וזמני היום ל-Google Calendar
                </h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-400/25 text-purple-100 border border-purple-300/40">
                  🎨 יומן נפרד בצבע שונה
                </span>
              </div>
              <p className="text-xs text-purple-100/90 mt-0.5">
                בחר אילו רכיבים וזמני היום יופיעו ביומן האוטומטי שלך — פתוח לחלוטין לכולם גם ללא הרשמה לאתר!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-purple-200 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* 1. City / Location Selection for Zmanim & Shabbat Times */}
          <div className="bg-purple-50/60 border border-purple-200/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-700 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. בחירת עיר לחישוב זמני היום, כניסת שבת וצומות:
                </h3>
              </div>
              <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full">
                📍 {cityConfig.name} ({cityConfig.region})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <select
                value={options.city}
                onChange={(e) => updateOptions({ city: e.target.value })}
                className="w-full text-sm font-bold text-slate-900 bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-purple-500"
              >
                {HEBREW_CALENDAR_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.region}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_CITY_IDS.map((cid) => {
                  const c = HEBREW_CALENDAR_CITIES.find((x) => x.id === cid);
                  if (!c) return null;
                  const active = options.city === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => updateOptions({ city: cid })}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100/60'
                      }`}
                    >
                      {c.name.split(' / ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. What Appears in the Calendar (Hebrew Date, Shabbatot, Fasts, Holidays) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  2. מה יופיע ביומן העברי? (בחר את הרכיבים הרצויים):
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Toggle 1: Daily Hebrew Date */}
              <div
                onClick={() => updateOptions({ hebrewDates: !options.hebrewDates })}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                  options.hebrewDates
                    ? 'bg-white border-purple-400 shadow-xs'
                    : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.hebrewDates}
                      onChange={() => {}}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300"
                    />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      📅 תאריך עברי יומי (בכל יום בשנה)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-serif">
                    {livePreview.todayHebrewTitle}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 pr-6">
                  מציג בראש כל יום ביומן גוגל את התאריך העברי המדויק באותיות עבריות.
                </p>
                {options.hebrewDates && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pr-6 pt-1 flex items-center gap-3 text-[11px] font-bold text-purple-900"
                  >
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeYearInDate}
                        onChange={(e) => updateOptions({ includeYearInDate: e.target.checked })}
                        className="w-3.5 h-3.5 text-purple-600 rounded"
                      />
                      <span>הצג גם שנה עברית (למשל: י״ז בתשרי תשפ״ז)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Toggle 2: Shabbatot (Parsha Name + Entry/Exit Times) */}
              <div
                onClick={() => updateOptions({ shabbat: !options.shabbat })}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                  options.shabbat
                    ? 'bg-white border-amber-400 shadow-xs'
                    : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.shabbat}
                      onChange={() => {}}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300"
                    />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      🕯️ שבתות (שם הפרשה + זמני כניסה ויציאה)
                    </span>
                  </div>
                  {livePreview.upcomingShabbat && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-serif">
                      {livePreview.upcomingShabbat.parshaName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 pr-6">
                  מציג את שם הפרשה (למשל: פרשת בראשית), שבתות מיוחדות, וזמני הדלקת נרות וצאת שבת.
                </p>
                {options.shabbat && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pr-6 pt-1 flex items-center gap-3 text-[11px] font-bold text-amber-950"
                  >
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.timedCandles}
                        onChange={(e) => updateOptions({ timedCandles: e.target.checked })}
                        className="w-3.5 h-3.5 text-amber-600 rounded"
                      />
                      <span>הוסף גם אירוע מתוזמן בשעת הדלקת נרות וצאת שבת</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Toggle 3: Fasts (צומות ותעניות) */}
              <div
                onClick={() => updateOptions({ fasts: !options.fasts })}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  options.fasts
                    ? 'bg-white border-rose-400 shadow-xs'
                    : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.fasts}
                      onChange={() => {}}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300"
                    />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      ⏳ צומות ותעניות (עם זמני תחילת וסיום הצום)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 pr-6">
                  צום גדליה, יום הכיפורים, עשרה בטבת, תענית אסתר, י״ז בתמוז ותשעה באב — כולל שעת כניסת וצאת הצום.
                </p>
              </div>

              {/* Toggle 4: Holidays & Festivals (חגים ומועדים) */}
              <div
                onClick={() => updateOptions({ holidays: !options.holidays })}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  options.holidays
                    ? 'bg-white border-emerald-400 shadow-xs'
                    : 'bg-slate-100/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.holidays}
                      onChange={() => {}}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                    />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      ✡️ חגי ישראל ומועדים (כולל זמני החג)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 pr-6">
                  ראש השנה, סוכות, שמחת תורה, חנוכה, ט״ו בשבט, פורים, פסח, ל״ג בעומר, שבועות וחול המועד.
                </p>
              </div>
            </div>

            {/* Secondary Toggles Row: Rosh Chodesh, Omer, Modern Holidays */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.roshChodesh}
                  onChange={(e) => updateOptions({ roshChodesh: e.target.checked })}
                  className="w-3.5 h-3.5 text-purple-600 rounded"
                />
                <span>🌒 ראשי חודשים</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.omer}
                  onChange={(e) => updateOptions({ omer: e.target.checked })}
                  className="w-3.5 h-3.5 text-purple-600 rounded"
                />
                <span>🌾 ספירת העומר היומית</span>
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.modernHolidays}
                  onChange={(e) => updateOptions({ modernHolidays: e.target.checked })}
                  className="w-3.5 h-3.5 text-purple-600 rounded"
                />
                <span>🇮🇱 מועדים ממלכתיים (יום הזיכרון, העצמאות וירושלים)</span>
              </label>
            </div>
          </div>

          {/* 3. Selectable Daily Zmanim (זמני היום לבחירה) */}
          <div className="bg-amber-50/50 border border-amber-200/90 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    3. זמני היום ההלכתיים לבחירה ({options.zmanim.length} זמנים נבחרו):
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    סמן אילו מזמני היום תרצה שיופיעו ביומן שלך (לפי {cityConfig.name} — הזמנים המוצגים הם להיום):
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectRecommendedZmanim}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[11px] font-bold transition cursor-pointer"
                >
                  מומלצים (5)
                </button>
                <button
                  type="button"
                  onClick={selectAllZmanim}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                >
                  בחר הכל
                </button>
                <button
                  type="button"
                  onClick={clearAllZmanim}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                >
                  ללא זמני היום
                </button>
              </div>
            </div>

            {/* Grid of 14 Selectable Zmanim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SELECTABLE_ZMANIM_OPTIONS.map((zm) => {
                const isSelected = options.zmanim.includes(zm.id);
                const todayTime = allTodayZmanimMap.get(zm.id);
                return (
                  <button
                    key={zm.id}
                    type="button"
                    onClick={() => toggleZman(zm.id)}
                    title={zm.description}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition cursor-pointer ${
                      isSelected
                        ? 'bg-white border-amber-400 text-slate-900 shadow-2xs ring-1 ring-amber-300/60'
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 border border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-xs font-bold truncate">
                        {zm.emoji} {zm.label}
                      </span>
                    </div>
                    {todayTime && (
                      <span
                        className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-amber-100 text-amber-950'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {todayTime}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Display Mode for Selected Zmanim */}
            {options.zmanim.length > 0 && (
              <div className="pt-2.5 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  איך להציג את זמני היום שנבחרו ביומן Google?
                </span>
                <select
                  value={options.zmanimDisplay}
                  onChange={(e) =>
                    updateOptions({ zmanimDisplay: e.target.value as ZmanimDisplayMode })
                  }
                  className="text-xs font-bold text-slate-900 bg-white border border-amber-300 rounded-xl px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="in_date">
                    משולב בתוך התאריך העברי היומי (מומלץ ונקי ביומן)
                  </option>
                  <option value="daily_banner">
                    שורת זמני היום נפרדת בראש כל יום (בכותרת האירוע)
                  </option>
                  <option value="timed">
                    אירועים מתוזמנים בשעה המדויקת של כל זמן ביומן היומי
                  </option>
                </select>
              </div>
            )}
          </div>

          {/* 4. Live Preview of How Events Look in Google Calendar */}
          <div className="bg-gradient-to-l from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 border border-purple-700/50 shadow-md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <h3 className="text-xs sm:text-sm font-extrabold text-purple-100">
                  תצוגה מקדימה חיה — כך ייראו האירועים ביומן העברי שלך ({cityConfig.name}):
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-100">
                מתעדכן אוטומטית בכל שנה
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Preview Card 1: Today's Hebrew Date & Zmanim */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-purple-200 font-bold">
                  <span>היום ({livePreview.todayGregorianStr})</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px]">
                    {options.hebrewDates ? 'פעיל ✓' : 'כבוי'}
                  </span>
                </div>
                <div className="font-serif font-black text-sm text-white">
                  📅 {livePreview.todayHebrewTitle}
                </div>
                {livePreview.todayZmanim.length > 0 ? (
                  <div className="text-[11px] text-purple-100/90 space-y-0.5 pt-1 border-t border-white/10">
                    {livePreview.todayZmanim.slice(0, 4).map((z) => (
                      <div key={z.id} className="flex items-center justify-between">
                        <span>
                          {z.emoji} {z.shortLabel}:
                        </span>
                        <span className="font-mono font-bold text-amber-300">{z.timeStr}</span>
                      </div>
                    ))}
                    {livePreview.todayZmanim.length > 4 && (
                      <div className="text-[10px] text-purple-300 pt-0.5">
                        + עוד {livePreview.todayZmanim.length - 4} זמנים שנבחרו...
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-purple-300">ללא זמני היום</p>
                )}
              </div>

              {/* Preview Card 2: Upcoming Shabbat */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-purple-200 font-bold">
                  <span>השבת הקרובה ({livePreview.upcomingShabbat?.shabbatHebrewStr})</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                    {options.shabbat ? 'פעיל ✓' : 'כבוי'}
                  </span>
                </div>
                <div className="font-serif font-black text-sm text-amber-300">
                  📖 שבת {livePreview.upcomingShabbat?.parshaName}
                </div>
                {livePreview.upcomingShabbat && (
                  <div className="text-[11px] text-purple-100/90 space-y-1 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span>🕯️ הדלקת נרות (ו׳):</span>
                      <span className="font-mono font-bold text-amber-300">
                        {livePreview.upcomingShabbat.candleLightingTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>✨ צאת השבת והבדלה:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {livePreview.upcomingShabbat.havdalahTime}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Card 3: Upcoming Holiday / Fast */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-purple-200 font-bold">
                  <span>המועד / הצום הקרוב</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black">
                    {options.holidays || options.fasts || options.roshChodesh ? 'פעיל ✓' : 'כבוי'}
                  </span>
                </div>
                {livePreview.upcomingHolidayOrFast ? (
                  <>
                    <div className="font-serif font-black text-sm text-emerald-300">
                      {livePreview.upcomingHolidayOrFast.isFast ? '⏳' : '✡️'}{' '}
                      {livePreview.upcomingHolidayOrFast.title}
                    </div>
                    <div className="text-[11px] text-purple-100/90 pt-1 border-t border-white/10 space-y-0.5">
                      <div>
                        תאריך: {livePreview.upcomingHolidayOrFast.hebrewDateStr} (
                        {livePreview.upcomingHolidayOrFast.gregorianDateStr})
                      </div>
                      {livePreview.upcomingHolidayOrFast.timesNote && (
                        <div className="text-amber-300 font-semibold">
                          {livePreview.upcomingHolidayOrFast.timesNote}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-purple-300">סמן חגים או צומות להצגה</p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Calendar Name & 1-Click Add to Google Calendar */}
          <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                    <span>שם היומן העברי שיופיע ב-Google Calendar (ניתן לעריכה):</span>
                  </span>
                  {options.calName && options.calName !== defaultCalName && (
                    <button
                      type="button"
                      onClick={() => updateOptions({ calName: '' })}
                      className="text-purple-700 hover:underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>איפוס לברירת מחדל</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={options.calName || ''}
                  onChange={(e) => updateOptions({ calName: e.target.value })}
                  placeholder={defaultCalName}
                  className="w-full text-xs sm:text-sm font-bold text-slate-900 bg-white border border-purple-300 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href={feedUrls.googleSub}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-l from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-purple-700/25 transition transform hover:scale-[1.01] active:scale-98"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>📅 הוסף יומן תאריך עברי וזמנים ל-Google</span>
              </a>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-purple-300 hover:bg-purple-50 text-slate-800 rounded-2xl font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 font-extrabold">
                      קישור היומן העברי הועתק ללוח!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>העתק קישור יומן עברי (ל-Apple / Outlook / Google)</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white/80 p-3 rounded-xl border border-purple-200/70">
              <HelpCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                <strong>למה זה יומן נפרד?</strong> מכיוון שזהו פיד עצמאי, Google Calendar מוסיף אותו תחת &quot;יומנים אחרים&quot; בצבע נפרד משלו (סגול/אינדיגו), בנפרד מהיומן האישי שלך, מיומן ימי הזיכרון ומיומן השמחות — וניתן להדליק או לכבות את הצגתו בלחיצה אחת!
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <a
            href={feedUrls.https}
            download="hebrew-calendar-zmanim.ics"
            className="inline-flex items-center gap-1.5 text-xs text-purple-800 hover:text-purple-950 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>הורד קובץ יומן תאריך עברי וזמנים (.ICS)</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
