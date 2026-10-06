import {
  HDate,
  HebrewCalendar,
  Location,
  Zmanim,
  flags,
  ParshaEvent,
  TimedEvent,
  CandleLightingEvent,
  HavdalahEvent,
} from '@hebcal/core';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { formatHebrewDateString, formatHebrewDay, HEBREW_MONTHS_TRANSLATION } from './hebrew-calendar';

export interface HebrewCalendarCity {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  elevation: number;
  tzid: string;
  il: boolean;
  candleLightingMins: number;
}

export const HEBREW_CALENDAR_CITIES: HebrewCalendarCity[] = [
  {
    id: 'jerusalem',
    name: 'ירושלים',
    region: 'הדלקת נרות: 40 דק׳ לפני השקיעה',
    latitude: 31.7683,
    longitude: 35.2137,
    elevation: 800,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 40,
  },
  {
    id: 'bnei_brak',
    name: 'בני ברק / גוש דן',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 32.0849,
    longitude: 34.8352,
    elevation: 30,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'tel_aviv',
    name: 'תל אביב והמרכז',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 32.0853,
    longitude: 34.7818,
    elevation: 15,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'haifa',
    name: 'חיפה והקריות',
    region: 'הדלקת נרות: 30 דק׳ לפני השקיעה',
    latitude: 32.794,
    longitude: 34.9896,
    elevation: 200,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 30,
  },
  {
    id: 'modiin',
    name: 'מודיעין / מודיעין עילית',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 31.8969,
    longitude: 35.0104,
    elevation: 260,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'beit_shemesh',
    name: 'בית שמש',
    region: 'הדלקת נרות: 40 דק׳ לפני השקיעה',
    latitude: 31.747,
    longitude: 34.9881,
    elevation: 300,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 40,
  },
  {
    id: 'beer_sheva',
    name: 'באר שבע והדרום',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 31.2518,
    longitude: 34.7913,
    elevation: 280,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'ashdod',
    name: 'אשדוד / אשקלון',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 31.8044,
    longitude: 34.6553,
    elevation: 25,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'netanya',
    name: 'נתניה והשרון',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 32.3215,
    longitude: 34.8532,
    elevation: 30,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'petah_tikva',
    name: 'פתח תקווה / אלעד',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 32.084,
    longitude: 34.8878,
    elevation: 50,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'rehovot',
    name: 'רחובות / ראשון לציון',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 31.8928,
    longitude: 34.8113,
    elevation: 50,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'tzfat',
    name: 'צפת והגליל',
    region: 'הדלקת נרות: 30 דק׳ לפני השקיעה',
    latitude: 32.9646,
    longitude: 35.496,
    elevation: 850,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 30,
  },
  {
    id: 'tiberias',
    name: 'טבריה והכנרת',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 32.7922,
    longitude: 35.5312,
    elevation: 0,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'eilat',
    name: 'אילת',
    region: 'הדלקת נרות: 20 דק׳ לפני השקיעה',
    latitude: 29.5577,
    longitude: 34.9519,
    elevation: 15,
    tzid: 'Asia/Jerusalem',
    il: true,
    candleLightingMins: 20,
  },
  {
    id: 'new_york',
    name: 'ניו יורק (חו״ל)',
    region: 'הדלקת נרות: 18 דק׳ לפני השקיעה',
    latitude: 40.7128,
    longitude: -74.006,
    elevation: 10,
    tzid: 'America/New_York',
    il: false,
    candleLightingMins: 18,
  },
  {
    id: 'london',
    name: 'לונדון (חו״ל)',
    region: 'הדלקת נרות: 18 דק׳ לפני השקיעה',
    latitude: 51.5074,
    longitude: -0.1278,
    elevation: 20,
    tzid: 'Europe/London',
    il: false,
    candleLightingMins: 18,
  },
];

export type ZmanimKey =
  | 'alot'
  | 'misheyakir'
  | 'sunrise'
  | 'szksMga'
  | 'szksGra'
  | 'sztMga'
  | 'sztGra'
  | 'chatzot'
  | 'minchaGedola'
  | 'minchaKetana'
  | 'plagHaMincha'
  | 'sunset'
  | 'tzeit'
  | 'tzeitRT';

export interface SelectableZmanOption {
  id: ZmanimKey;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  defaultSelected?: boolean;
}

export const SELECTABLE_ZMANIM_OPTIONS: SelectableZmanOption[] = [
  {
    id: 'alot',
    label: 'עלות השחר',
    shortLabel: 'עלות',
    emoji: '🌅',
    description: 'תחילת היום ההלכתי (16.1° מתחת לאופק)',
  },
  {
    id: 'misheyakir',
    label: 'זמן טלית ותפילין (משיכיר)',
    shortLabel: 'טלית ותפילין',
    emoji: '🧣',
    description: 'הזמן המוקדם להנחת תפילין ולבישת ציצית (11.5°)',
  },
  {
    id: 'sunrise',
    label: 'הנץ החמה (זריחה)',
    shortLabel: 'הנץ',
    emoji: '☀️',
    description: 'זריחת השמש (זמן תפילת שחרית לכתחילה)',
    defaultSelected: true,
  },
  {
    id: 'szksMga',
    label: 'סוף זמן קריאת שמע (מג״א)',
    shortLabel: 'ק״ש מג״א',
    emoji: '📖',
    description: 'סוף זמן ק״ש של שחרית לפי המגן אברהם',
  },
  {
    id: 'szksGra',
    label: 'סוף זמן קריאת שמע (גר״א)',
    shortLabel: 'ק״ש גר״א',
    emoji: '📖',
    description: 'סוף זמן ק״ש של שחרית לפי הגר״א ובעל התניא',
    defaultSelected: true,
  },
  {
    id: 'sztMga',
    label: 'סוף זמן תפילה (מג״א)',
    shortLabel: 'תפילה מג״א',
    emoji: '🙏',
    description: 'סוף זמן תפילת שחרית לפי המגן אברהם',
  },
  {
    id: 'sztGra',
    label: 'סוף זמן תפילה (גר״א)',
    shortLabel: 'תפילה גר״א',
    emoji: '🙏',
    description: 'סוף זמן תפילת שחרית לפי הגר״א (4 שעות זמניות)',
    defaultSelected: true,
  },
  {
    id: 'chatzot',
    label: 'חצות היום',
    shortLabel: 'חצות',
    emoji: '🕛',
    description: 'אמצע היום ההלכתי (6 שעות זמניות)',
  },
  {
    id: 'minchaGedola',
    label: 'מנחה גדולה',
    shortLabel: 'מנחה גדולה',
    emoji: '🕒',
    description: 'הזמן המוקדם לתפילת מנחה (חצי שעה זמנית אחר חצות)',
  },
  {
    id: 'minchaKetana',
    label: 'מנחה קטנה',
    shortLabel: 'מנחה קטנה',
    emoji: '🕓',
    description: 'זמן מנחה קטנה (9.5 שעות זמניות)',
  },
  {
    id: 'plagHaMincha',
    label: 'פלג המנחה',
    shortLabel: 'פלג המנחה',
    emoji: '🕔',
    description: 'שעה ורבע זמנית לפני השקיעה',
  },
  {
    id: 'sunset',
    label: 'שקיעת החמה (שקיעה)',
    shortLabel: 'שקיעה',
    emoji: '🌇',
    description: 'שקיעת השמש וסיום היום ההלכתי',
    defaultSelected: true,
  },
  {
    id: 'tzeit',
    label: 'צאת הכוכבים',
    shortLabel: 'צאת הכוכבים',
    emoji: '✨',
    description: 'צאת שלושה כוכבים (8.5° מתחת לאופק)',
    defaultSelected: true,
  },
  {
    id: 'tzeitRT',
    label: 'צאת הכוכבים (רבינו תם)',
    shortLabel: 'צאת ר״ת',
    emoji: '🌌',
    description: '72 דקות לאחר שקיעת החמה',
  },
];

export type ZmanimDisplayMode = 'in_date' | 'daily_banner' | 'timed';

export interface HebrewCalendarFeedOptions {
  city: string;
  hebrewDates: boolean;
  includeYearInDate: boolean;
  shabbat: boolean;
  holidays: boolean;
  fasts: boolean;
  roshChodesh: boolean;
  omer: boolean;
  modernHolidays: boolean;
  timedCandles: boolean;
  zmanim: ZmanimKey[];
  zmanimDisplay: ZmanimDisplayMode;
  calName?: string;
}

export const DEFAULT_HEBREW_CALENDAR_OPTIONS: HebrewCalendarFeedOptions = {
  city: 'jerusalem',
  hebrewDates: true,
  includeYearInDate: true,
  shabbat: true,
  holidays: true,
  fasts: true,
  roshChodesh: true,
  omer: false,
  modernHolidays: true,
  timedCandles: true,
  zmanim: ['sunrise', 'szksGra', 'sztGra', 'sunset', 'tzeit'],
  zmanimDisplay: 'in_date',
  calName: '',
};

export function getCityConfig(cityId?: string | null): HebrewCalendarCity {
  const found = HEBREW_CALENDAR_CITIES.find((c) => c.id === cityId);
  return found || HEBREW_CALENDAR_CITIES[0];
}

export function createHebcalLocation(city: HebrewCalendarCity): Location {
  return new Location(
    city.latitude,
    city.longitude,
    city.il,
    city.tzid,
    city.name,
    city.il ? 'IL' : 'US',
    city.id,
    city.elevation
  );
}

const timeFormattersByTz = new Map<string, Intl.DateTimeFormat>();
function formatTimeInTz(date: Date, tzid: string): string {
  if (!date || isNaN(date.getTime())) return '';
  let fmt = timeFormattersByTz.get(tzid);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: tzid,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    timeFormattersByTz.set(tzid, fmt);
  }
  return fmt.format(date);
}

export interface ComputedZmanItem {
  id: ZmanimKey;
  label: string;
  shortLabel: string;
  emoji: string;
  time: Date;
  timeStr: string;
}

/**
 * Computes the requested daily Zmanim for a given Gregorian date and city.
 */
export function computeDailyZmanimForDate(
  gregDate: Date,
  city: HebrewCalendarCity,
  selectedKeys: ZmanimKey[]
): ComputedZmanItem[] {
  if (!selectedKeys || selectedKeys.length === 0) return [];

  const loc = createHebcalLocation(city);
  const zmanim = new Zmanim(loc, gregDate, false);
  const results: ComputedZmanItem[] = [];

  for (const key of selectedKeys) {
    const meta = SELECTABLE_ZMANIM_OPTIONS.find((o) => o.id === key);
    if (!meta) continue;

    let dt: Date | null = null;
    try {
      switch (key) {
        case 'alot':
          dt = zmanim.alotHaShachar();
          break;
        case 'misheyakir':
          dt = zmanim.misheyakir();
          break;
        case 'sunrise':
          dt = zmanim.sunrise();
          break;
        case 'szksMga':
          dt = zmanim.sofZmanShmaMGA();
          break;
        case 'szksGra':
          dt = zmanim.sofZmanShma();
          break;
        case 'sztMga':
          dt = zmanim.sofZmanTfillaMGA();
          break;
        case 'sztGra':
          dt = zmanim.sofZmanTfilla();
          break;
        case 'chatzot':
          dt = zmanim.chatzot();
          break;
        case 'minchaGedola':
          dt = zmanim.minchaGedola();
          break;
        case 'minchaKetana':
          dt = zmanim.minchaKetana();
          break;
        case 'plagHaMincha':
          dt = zmanim.plagHaMincha();
          break;
        case 'sunset':
          dt = zmanim.sunset();
          break;
        case 'tzeit':
          dt = zmanim.tzeit(8.5);
          break;
        case 'tzeitRT':
          dt = zmanim.sunsetOffset(72, true);
          break;
      }
    } catch {
      dt = null;
    }

    if (dt && !isNaN(dt.getTime())) {
      const rounded = Zmanim.roundTime(dt);
      const timeStr = formatTimeInTz(rounded, city.tzid);
      if (timeStr) {
        results.push({
          id: key,
          label: meta.label,
          shortLabel: meta.shortLabel,
          emoji: meta.emoji,
          time: rounded,
          timeStr,
        });
      }
    }
  }

  return results;
}

/**
 * Formats a clean Hebrew date title for a given HDate.
 */
export function formatCleanHebrewDateTitle(hd: HDate, includeYear: boolean = true): string {
  const day = hd.getDate();
  const monthName = hd.getMonthName();
  const year = hd.getFullYear();
  if (includeYear) {
    return formatHebrewDateString(day, monthName, year);
  }
  const dayStr = formatHebrewDay(day);
  const monthHeb = HEBREW_MONTHS_TRANSLATION[monthName] || monthName;
  return `${dayStr} ב${monthHeb}`;
}

/**
 * Parses URL searchParams into a full HebrewCalendarFeedOptions object.
 */
export function parseHebrewCalendarQueryParams(searchParams: URLSearchParams): HebrewCalendarFeedOptions {
  const city = searchParams.get('city') || DEFAULT_HEBREW_CALENDAR_OPTIONS.city;
  const hebrewDates = searchParams.get('dates') !== '0';
  const includeYearInDate = searchParams.get('year') !== '0';
  const shabbat = searchParams.get('shabbat') !== '0';
  const holidays = searchParams.get('holidays') !== '0';
  const fasts = searchParams.get('fasts') !== '0';
  const roshChodesh = searchParams.get('roshChodesh') !== '0';
  const omer = searchParams.get('omer') === '1';
  const modernHolidays = searchParams.get('modern') !== '0';
  const timedCandles = searchParams.get('timedCandles') !== '0';
  const calName = (searchParams.get('calName') || '').trim();

  const rawZmanim = searchParams.get('zmanim');
  const validZmanIds = new Set<string>(SELECTABLE_ZMANIM_OPTIONS.map((z) => z.id));
  let zmanim: ZmanimKey[];
  if (rawZmanim === null) {
    zmanim = [...DEFAULT_HEBREW_CALENDAR_OPTIONS.zmanim];
  } else if (rawZmanim === '' || rawZmanim === 'none') {
    zmanim = [];
  } else {
    zmanim = rawZmanim
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is ZmanimKey => validZmanIds.has(s));
  }

  const rawDisplay = searchParams.get('zmanimMode') as ZmanimDisplayMode | null;
  const zmanimDisplay: ZmanimDisplayMode =
    rawDisplay === 'daily_banner' || rawDisplay === 'timed' || rawDisplay === 'in_date'
      ? rawDisplay
      : 'in_date';

  return {
    city,
    hebrewDates,
    includeYearInDate,
    shabbat,
    holidays,
    fasts,
    roshChodesh,
    omer,
    modernHolidays,
    timedCandles,
    zmanim,
    zmanimDisplay,
    calName,
  };
}

/**
 * Serializes HebrewCalendarFeedOptions into compact URLSearchParams.
 */
export function buildHebrewCalendarQueryParams(options: HebrewCalendarFeedOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set('v', '1');
  params.set('city', options.city || 'jerusalem');
  params.set('dates', options.hebrewDates ? '1' : '0');
  if (!options.includeYearInDate) params.set('year', '0');
  params.set('shabbat', options.shabbat ? '1' : '0');
  params.set('holidays', options.holidays ? '1' : '0');
  params.set('fasts', options.fasts ? '1' : '0');
  params.set('roshChodesh', options.roshChodesh ? '1' : '0');
  if (options.omer) params.set('omer', '1');
  if (!options.modernHolidays) params.set('modern', '0');
  if (!options.timedCandles) params.set('timedCandles', '0');
  params.set('zmanim', options.zmanim.length > 0 ? options.zmanim.join(',') : 'none');
  if (options.zmanimDisplay !== 'in_date') {
    params.set('zmanimMode', options.zmanimDisplay);
  }
  if (options.calName && options.calName.trim()) {
    params.set('calName', options.calName.trim());
  }
  return params;
}

export function getDefaultHebrewCalendarDisplayName(options: HebrewCalendarFeedOptions): string {
  if (options.calName && options.calName.trim()) {
    return options.calName.trim();
  }
  const city = getCityConfig(options.city);
  return `לוח עברי, שבתות וזמנים (${city.name})`;
}

function toIsoDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface LivePreviewData {
  todayHebrewTitle: string;
  todayGregorianStr: string;
  todayZmanim: ComputedZmanItem[];
  upcomingShabbat: {
    parshaName: string;
    fridayDateStr: string;
    shabbatHebrewStr: string;
    candleLightingTime: string;
    havdalahTime: string;
  } | null;
  upcomingHolidayOrFast: {
    title: string;
    hebrewDateStr: string;
    gregorianDateStr: string;
    isFast: boolean;
    timesNote?: string;
  } | null;
}

/**
 * Computes a live preview for the HebrewCalendarSyncModal so the user can see
 * exactly how Today's Hebrew Date + Zmanim, the Upcoming Shabbat, and the Next Holiday/Fast look.
 */
export function getHebrewCalendarLivePreview(options: HebrewCalendarFeedOptions): LivePreviewData {
  const city = getCityConfig(options.city);
  const loc = createHebcalLocation(city);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const todayHd = new HDate(today);

  const todayHebrewTitle = formatCleanHebrewDateTitle(todayHd, options.includeYearInDate);
  const todayGregorianStr = today.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const todayZmanim = computeDailyZmanimForDate(today, city, options.zmanim);

  // Find upcoming Friday & Saturday for Shabbat preview
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  const fridayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilFriday, 12, 0, 0);
  const saturdayDate = new Date(fridayDate.getFullYear(), fridayDate.getMonth(), fridayDate.getDate() + 1, 12, 0, 0);
  const saturdayHd = new HDate(saturdayDate);

  const zmanimFri = new Zmanim(loc, fridayDate, false);
  const zmanimSat = new Zmanim(loc, saturdayDate, false);
  const candleTime = Zmanim.roundTime(zmanimFri.sunsetOffset(-city.candleLightingMins, true));
  const havdalahTime = Zmanim.roundTime(zmanimSat.tzeit(8.5));

  const sedra = HebrewCalendar.getSedra(saturdayHd.getFullYear(), city.il);
  const sedraLookup = sedra.lookup(saturdayHd);
  let parshaName = '';
  if (!sedraLookup.chag && sedraLookup.parsha && sedraLookup.parsha.length > 0) {
    parshaName = new ParshaEvent(sedraLookup).render('he-x-NoNikud');
  } else {
    const satHolidays = HebrewCalendar.getHolidaysOnDate(saturdayHd, city.il) || [];
    parshaName = satHolidays.length > 0 ? satHolidays[0].render('he-x-NoNikud') : 'שבת קודש';
  }

  const upcomingShabbat = {
    parshaName,
    fridayDateStr: fridayDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
    shabbatHebrewStr: formatCleanHebrewDateTitle(saturdayHd, false),
    candleLightingTime: formatTimeInTz(candleTime, city.tzid),
    havdalahTime: formatTimeInTz(havdalahTime, city.tzid),
  };

  // Find next upcoming Holiday or Fast in the next 90 days
  const endPreview = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120, 12, 0, 0);
  const rawEvents = HebrewCalendar.calendar({
    start: today,
    end: endPreview,
    location: loc,
    il: city.il,
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    sedrot: false,
    noMinorFast: !options.fasts,
    noModern: !options.modernHolidays,
    noRoshChodesh: !options.roshChodesh,
    omer: false,
  });

  let upcomingHolidayOrFast: LivePreviewData['upcomingHolidayOrFast'] = null;
  for (const ev of rawEvents) {
    const m = ev.getFlags();
    if (m & (flags.LIGHT_CANDLES | flags.LIGHT_CANDLES_TZEIS | flags.YOM_TOV_ENDS | flags.PARSHA_HASHAVUA)) {
      continue;
    }
    const isFast = Boolean(m & (flags.MINOR_FAST | flags.MAJOR_FAST));
    const isRoshChodesh = Boolean(m & flags.ROSH_CHODESH);
    const isHoliday = Boolean(m & (flags.CHAG | flags.MINOR_HOLIDAY | flags.CHOL_HAMOED | flags.MODERN_HOLIDAY | flags.CHANUKAH_CANDLES));

    if (isFast && !options.fasts) continue;
    if (isRoshChodesh && !options.roshChodesh) continue;
    if (isHoliday && !options.holidays) continue;
    if (!isFast && !isRoshChodesh && !isHoliday) continue;

    const hd = ev.getDate();
    const greg = hd.greg();
    const title = ev.render('he-x-NoNikud');
    let timesNote: string | undefined;

    if (isFast) {
      const zm = new Zmanim(loc, greg, false);
      if (ev.getDesc().includes("Tish'a B'Av") || ev.getDesc() === 'Yom Kippur') {
        const eve = new Date(greg.getFullYear(), greg.getMonth(), greg.getDate() - 1, 12, 0, 0);
        const zmEve = new Zmanim(loc, eve, false);
        const startDt = ev.getDesc() === 'Yom Kippur' ? zmEve.sunsetOffset(-city.candleLightingMins, true) : zmEve.sunset();
        const endDt = ev.getDesc() === 'Yom Kippur' ? zm.tzeit(8.5) : zm.tzeit(6.45);
        timesNote = `כניסת הצום בערב: ${formatTimeInTz(startDt, city.tzid)} • סיום הצום: ${formatTimeInTz(endDt, city.tzid)}`;
      } else {
        const startDt = zm.alotHaShachar();
        const endDt = city.il ? zm.sunsetOffset(15, true) : zm.tzeit(7.0833);
        timesNote = `תחילת הצום (עלות השחר): ${formatTimeInTz(startDt, city.tzid)} • סיום הצום: ${formatTimeInTz(endDt, city.tzid)}`;
      }
    }

    upcomingHolidayOrFast = {
      title,
      hebrewDateStr: formatCleanHebrewDateTitle(hd, false),
      gregorianDateStr: greg.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }),
      isFast,
      timesNote,
    };
    break;
  }

  return {
    todayHebrewTitle,
    todayGregorianStr,
    todayZmanim,
    upcomingShabbat,
    upcomingHolidayOrFast,
  };
}

/**
 * Generates the complete iCalendar (.ics) string for the automatic Hebrew Calendar feed.
 */
export function generateHebrewCalendarIcs(
  options: HebrewCalendarFeedOptions,
  appOrigin: string = 'https://family-zmanim.vercel.app'
): string {
  const city = getCityConfig(options.city);
  const loc = createHebcalLocation(city);
  const displayCalName = getDefaultHebrewCalendarDisplayName(options).normalize('NFKC');

  const activeFeatures: string[] = [];
  if (options.hebrewDates) activeFeatures.push('תאריך עברי יומי');
  if (options.shabbat) activeFeatures.push('שבתות ופרשת השבוע');
  if (options.holidays) activeFeatures.push('חגים ומועדים');
  if (options.fasts) activeFeatures.push('צומות ותעניות');
  if (options.roshChodesh) activeFeatures.push('ראשי חודשים');
  if (options.zmanim.length > 0) activeFeatures.push(`זמני היום (${city.name})`);

  const calDescription = `יומן תאריך עברי ומועדים מתעדכן אוטומטית (${city.name}) | כולל: ${activeFeatures.join(' • ')}`.normalize('NFKC');

  // Use a distinctive purple/violet color (#7c3aed) so it stands out from Memorials (#1e3a8a) and Simchas (#10b981)
  const cal = ical({
    name: displayCalName,
    description: calDescription,
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600,
    x: [
      ['X-WR-TIMEZONE', city.tzid],
      ['X-APPLE-CALENDAR-COLOR', '#7c3aed'],
      ['COLOR', '#7c3aed'],
    ],
  });

  const now = new Date();
  const dynamicSequence = Math.max(1, Math.floor((Date.now() - 1790000000000) / 60000));

  // Rolling window: 30 days back to 380 days forward (~13.5 months)
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 12, 0, 0);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 380, 12, 0, 0);

  // Gather all Hebcal events for the range
  const hebcalEvents = HebrewCalendar.calendar({
    start: startDate,
    end: endDate,
    location: loc,
    il: city.il,
    candlelighting: true,
    candleLightingMins: city.candleLightingMins,
    sedrot: true,
    shabbatMevarchim: true,
    noMinorFast: !options.fasts,
    noModern: !options.modernHolidays,
    noRoshChodesh: !options.roshChodesh,
    omer: options.omer,
  });

  // Group Hebcal events by ISO date YYYY-MM-DD
  interface DayBucket {
    parsha?: string;
    specialShabbat: string[];
    candleLighting?: { time: Date; timeStr: string; linkedTitle?: string };
    havdalah?: { time: Date; timeStr: string; linkedTitle?: string };
    holidays: Array<{ title: string; desc: string; mask: number; emoji: string }>;
    fasts: Array<{
      title: string;
      desc: string;
      mask: number;
      startTime?: Date;
      startTimeStr?: string;
      endTime?: Date;
      endTimeStr?: string;
    }>;
    roshChodesh: string[];
    omer?: string;
  }

  const buckets = new Map<string, DayBucket>();
  const getBucket = (key: string): DayBucket => {
    let b = buckets.get(key);
    if (!b) {
      b = {
        specialShabbat: [],
        holidays: [],
        fasts: [],
        roshChodesh: [],
      };
      buckets.set(key, b);
    }
    return b;
  };

  for (const ev of hebcalEvents) {
    const hd = ev.getDate();
    const greg = hd.greg();
    const dateKey = toIsoDateKey(greg);
    const bucket = getBucket(dateKey);
    const mask = ev.getFlags();
    const desc = ev.getDesc();
    const titleHe = ev.render('he-x-NoNikud');

    // 1. Parashat HaShavua
    if (mask & flags.PARSHA_HASHAVUA) {
      bucket.parsha = titleHe;
      continue;
    }

    // 2. Special Shabbat or Shabbat Mevarchim
    if (mask & (flags.SPECIAL_SHABBAT | flags.SHABBAT_MEVARCHIM)) {
      if (!bucket.specialShabbat.includes(titleHe)) {
        bucket.specialShabbat.push(titleHe);
      }
      continue;
    }

    // 3. Candle lighting & Havdalah timed events
    if (ev instanceof CandleLightingEvent) {
      const linkedTitle = ev.linkedEvent ? ev.linkedEvent.render('he-x-NoNikud') : undefined;
      bucket.candleLighting = {
        time: ev.eventTime,
        timeStr: formatTimeInTz(ev.eventTime, city.tzid) || ev.eventTimeStr,
        linkedTitle,
      };
      continue;
    }

    if (ev instanceof HavdalahEvent) {
      const linkedTitle = ev.linkedEvent ? ev.linkedEvent.render('he-x-NoNikud') : undefined;
      bucket.havdalah = {
        time: ev.eventTime,
        timeStr: formatTimeInTz(ev.eventTime, city.tzid) || ev.eventTimeStr,
        linkedTitle,
      };
      continue;
    }

    // Ignore standalone "Fast begins" / "Fast ends" timed sub-events since we compute exact fast start/end on the fast day itself
    if (ev instanceof TimedEvent && (desc === 'Fast begins' || desc === 'Fast ends')) {
      continue;
    }

    // 4. Omer count
    if (mask & flags.OMER_COUNT) {
      bucket.omer = titleHe;
      continue;
    }

    // 5. Rosh Chodesh
    if (mask & flags.ROSH_CHODESH) {
      if (!bucket.roshChodesh.includes(titleHe)) {
        bucket.roshChodesh.push(titleHe);
      }
      continue;
    }

    // 6. Fast Days (Minor & Major Fasts, and Erev Tisha B'Av / Erev Yom Kippur)
    const isFastDay =
      Boolean(mask & (flags.MINOR_FAST | flags.MAJOR_FAST)) ||
      desc === "Erev Tish'a B'Av" ||
      desc.startsWith("Tish'a B'Av");

    if (isFastDay) {
      const zm = new Zmanim(loc, greg, false);
      let startTime: Date | undefined;
      let endTime: Date | undefined;

      if (desc === "Erev Tish'a B'Av") {
        const s = zm.sunset();
        if (!isNaN(s.getTime())) startTime = Zmanim.roundTime(s);
      } else if (desc.startsWith("Tish'a B'Av")) {
        const eve = new Date(greg.getFullYear(), greg.getMonth(), greg.getDate() - 1, 12, 0, 0);
        const zmEve = new Zmanim(loc, eve, false);
        const s = zmEve.sunset();
        const e = zm.tzeit(6.45);
        if (!isNaN(s.getTime())) startTime = Zmanim.roundTime(s);
        if (!isNaN(e.getTime())) endTime = Zmanim.roundTime(e);
      } else if (desc === 'Yom Kippur') {
        const eve = new Date(greg.getFullYear(), greg.getMonth(), greg.getDate() - 1, 12, 0, 0);
        const zmEve = new Zmanim(loc, eve, false);
        const s = zmEve.sunsetOffset(-city.candleLightingMins, true);
        const e = zm.tzeit(8.5);
        if (!isNaN(s.getTime())) startTime = Zmanim.roundTime(s);
        if (!isNaN(e.getTime())) endTime = Zmanim.roundTime(e);
      } else {
        // Minor fast (Tzom Gedaliah, Asara B'Tevet, Ta'anit Esther, Tzom Tammuz)
        const s = zm.alotHaShachar();
        const e = city.il ? zm.sunsetOffset(15, true) : zm.tzeit(7.0833);
        if (!isNaN(s.getTime())) startTime = Zmanim.roundTime(s);
        if (greg.getDay() !== 5 && !isNaN(e.getTime())) {
          endTime = Zmanim.roundTime(e);
        }
      }

      bucket.fasts.push({
        title: titleHe,
        desc,
        mask,
        startTime,
        startTimeStr: startTime ? formatTimeInTz(startTime, city.tzid) : undefined,
        endTime,
        endTimeStr: endTime ? formatTimeInTz(endTime, city.tzid) : undefined,
      });

      // Note: Yom Kippur is also a Major Holiday so if holidays=true and fasts=false, still include it
      if (desc === 'Yom Kippur' && !options.fasts && options.holidays) {
        bucket.holidays.push({
          title: titleHe,
          desc,
          mask,
          emoji: '🕍',
        });
      }
      continue;
    }

    // 7. Holidays (Chag, Chol HaMoed, Minor Holiday, Modern Holiday, Erev Chag, Chanukah)
    if (
      mask &
      (flags.CHAG |
        flags.CHOL_HAMOED |
        flags.MINOR_HOLIDAY |
        flags.MODERN_HOLIDAY |
        flags.EREV |
        flags.CHANUKAH_CANDLES)
    ) {
      let emoji = '✡️';
      if (desc.includes('Rosh Hashana')) emoji = '🍎';
      else if (desc.includes('Sukkot') || desc.includes('Shmini Atzeret') || desc.includes('Simchat Torah')) emoji = '🌿';
      else if (desc.includes('Chanukah')) emoji = '🕎';
      else if (desc.includes('Tu BiShvat')) emoji = '🌳';
      else if (desc.includes('Purim')) emoji = '🎭';
      else if (desc.includes('Pesach')) emoji = '🍷';
      else if (desc.includes('Lag BaOmer')) emoji = '🔥';
      else if (desc.includes('Shavuot')) emoji = '🌾';
      else if (mask & flags.MODERN_HOLIDAY) emoji = '🇮🇱';

      // Avoid duplicate Chanukah titles on the same day
      if (!bucket.holidays.some((h) => h.title === titleHe)) {
        bucket.holidays.push({
          title: titleHe,
          desc,
          mask,
          emoji,
        });
      }
    }
  }

  // Now iterate day-by-day through our rolling window and emit the selected events
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i <= totalDays; i++) {
    const dayLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i, 12, 0, 0);
    const y = dayLocal.getFullYear();
    const m = dayLocal.getMonth();
    const d = dayLocal.getDate();
    const dow = dayLocal.getDay();
    const dateKey = toIsoDateKey(dayLocal);

    const startAllDayUtc = new Date(Date.UTC(y, m, d));
    const endAllDayUtc = new Date(Date.UTC(y, m, d + 1));

    const hd = new HDate(dayLocal);
    const hebrewDateFull = formatCleanHebrewDateTitle(hd, true);
    const hebrewDateDisplay = formatCleanHebrewDateTitle(hd, options.includeYearInDate);
    const bucket = getBucket(dateKey);

    // Compute daily zmanim if user selected any
    const dayZmanim =
      options.zmanim.length > 0 ? computeDailyZmanimForDate(dayLocal, city, options.zmanim) : [];

    // Next day's bucket (useful on Friday to know Saturday's Parsha & Havdalah time)
    const nextDayLocal = new Date(y, m, d + 1, 12, 0, 0);
    const nextDateKey = toIsoDateKey(nextDayLocal);
    const nextBucket = getBucket(nextDateKey);

    // Previous day's bucket (useful on Saturday to know Friday's candle lighting time)
    const prevDayLocal = new Date(y, m, d - 1, 12, 0, 0);
    const prevDateKey = toIsoDateKey(prevDayLocal);
    const prevBucket = getBucket(prevDateKey);

    // =========================================================================
    // A. DAILY HEBREW DATE EVENT (IF ENABLED)
    // =========================================================================
    if (options.hebrewDates) {
      let dateSummary = `📅 ${hebrewDateDisplay}`;

      // If user chose 'in_date' and selected up to 3 zmanim, show a compact preview in the title too
      if (options.zmanimDisplay === 'in_date' && dayZmanim.length > 0 && dayZmanim.length <= 3) {
        const inlineZmanim = dayZmanim.map((z) => `${z.shortLabel}: ${z.timeStr}`).join(' • ');
        dateSummary = `📅 ${hebrewDateDisplay} (${inlineZmanim})`;
      }

      const descLines: string[] = [
        `תאריך עברי: ${hebrewDateFull}`,
        `תאריך לועזי: ${dayLocal.toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })}`,
      ];

      if (bucket.parsha) {
        descLines.push(`פרשת השבוע: ${bucket.parsha}`);
      } else if (dow === 5 && nextBucket.parsha) {
        descLines.push(`שבת הקרובה: ${nextBucket.parsha}`);
      }

      if (bucket.roshChodesh.length > 0) {
        descLines.push(`ראש חודש: ${bucket.roshChodesh.join(' • ')}`);
      }
      if (bucket.holidays.length > 0) {
        descLines.push(`מועדים: ${bucket.holidays.map((h) => h.title).join(' • ')}`);
      }
      if (bucket.fasts.length > 0) {
        descLines.push(`צום/תענית: ${bucket.fasts.map((f) => f.title).join(' • ')}`);
      }
      if (bucket.omer) {
        descLines.push(`ספירת העומר: ${bucket.omer}`);
      }

      if (dayZmanim.length > 0) {
        descLines.push('');
        descLines.push(`🕒 זמני היום ההלכתיים (${city.name}):`);
        for (const z of dayZmanim) {
          descLines.push(`${z.emoji} ${z.label}: ${z.timeStr}`);
        }
      }

      descLines.push('');
      descLines.push(`הופק אוטומטית על ידי מערכת זמנים משפחתיים: ${appOrigin}`);

      cal.createEvent({
        id: `hebdate-${dateKey}@family-zmanim`,
        start: startAllDayUtc,
        end: endAllDayUtc,
        allDay: true,
        sequence: dynamicSequence,
        stamp: now,
        lastModified: now,
        summary: dateSummary.normalize('NFKC'),
        description: descLines.join('\n').normalize('NFKC'),
      });
    }

    // =========================================================================
    // B. DAILY ZMANIM (WHEN DISPLAY MODE IS 'daily_banner' OR 'timed')
    // =========================================================================
    if (dayZmanim.length > 0) {
      if (options.zmanimDisplay === 'daily_banner') {
        const bannerSummary = `🕒 זמני היום (${city.name}): ${dayZmanim
          .map((z) => `${z.shortLabel} ${z.timeStr}`)
          .join(' | ')}`;
        const bannerDesc = [
          `זמני היום ההלכתיים ליום ${hebrewDateFull} (${city.name}):`,
          ...dayZmanim.map((z) => `${z.emoji} ${z.label}: ${z.timeStr}`),
        ].join('\n');

        cal.createEvent({
          id: `zmanim-banner-${dateKey}@family-zmanim`,
          start: startAllDayUtc,
          end: endAllDayUtc,
          allDay: true,
          sequence: dynamicSequence,
          stamp: now,
          lastModified: now,
          summary: bannerSummary.normalize('NFKC'),
          description: bannerDesc.normalize('NFKC'),
        });
      } else if (options.zmanimDisplay === 'timed') {
        for (const z of dayZmanim) {
          const endZman = new Date(z.time.getTime() + 15 * 60 * 1000);
          cal.createEvent({
            id: `zman-${z.id}-${dateKey}@family-zmanim`,
            start: z.time,
            end: endZman,
            allDay: false,
            sequence: dynamicSequence,
            stamp: now,
            lastModified: now,
            summary: `${z.emoji} ${z.label} (${z.timeStr})`.normalize('NFKC'),
            description: `${z.label} לפי אופק ${city.name}\nתאריך עברי: ${hebrewDateFull}\nשעה: ${z.timeStr}`.normalize(
              'NFKC'
            ),
          });
        }
      }
    }

    // =========================================================================
    // C. SHABBATOT (PARSHA NAME + CANDLE LIGHTING & HAVDALAH TIMES)
    // =========================================================================
    if (options.shabbat) {
      // 1. Friday: Erev Shabbat Candle Lighting
      if (dow === 5 && bucket.candleLighting) {
        const shabbatParsha =
          nextBucket.parsha ||
          (nextBucket.holidays.length > 0 ? nextBucket.holidays[0].title : 'שבת קודש');
        const candleStr = bucket.candleLighting.timeStr;
        const motzeiStr = nextBucket.havdalah?.timeStr || '';

        // If user enabled timedCandles, create a timed event at the exact candle lighting time on Friday
        if (options.timedCandles) {
          const startCandle = bucket.candleLighting.time;
          const endCandle = new Date(startCandle.getTime() + 30 * 60 * 1000);
          cal.createEvent({
            id: `shabbat-candles-${dateKey}@family-zmanim`,
            start: startCandle,
            end: endCandle,
            allDay: false,
            sequence: dynamicSequence,
            stamp: now,
            lastModified: now,
            summary: `🕯️ הדלקת נרות שבת • ${shabbatParsha} (${candleStr})`.normalize('NFKC'),
            description: [
              `כניסת שבת והדלקת נרות: ${candleStr} (${city.name})`,
              `שבת: ${shabbatParsha}`,
              motzeiStr ? `צאת השבת והבדלה למחרת: ${motzeiStr}` : '',
              `תאריך עברי: ${hebrewDateFull}`,
            ]
              .filter(Boolean)
              .join('\n')
              .normalize('NFKC'),
          });
        } else {
          // Otherwise create an all-day Erev Shabbat reminder on Friday
          cal.createEvent({
            id: `erev-shabbat-${dateKey}@family-zmanim`,
            start: startAllDayUtc,
            end: endAllDayUtc,
            allDay: true,
            sequence: dynamicSequence,
            stamp: now,
            lastModified: now,
            summary: `🕯️ ערב שבת ${shabbatParsha} (הדלקת נרות: ${candleStr})`.normalize('NFKC'),
            description: [
              `ערב שבת קודש — ${shabbatParsha}`,
              `🕯️ זמן הדלקת נרות (${city.name}): ${candleStr}`,
              motzeiStr ? `✨ זמן צאת השבת והבדלה: ${motzeiStr}` : '',
            ]
              .filter(Boolean)
              .join('\n')
              .normalize('NFKC'),
          });
        }
      }

      // 2. Saturday: Shabbat Parashat HaShavua (with entry & exit times in title & description)
      if (dow === 6) {
        const parshaTitle =
          bucket.parsha ||
          (bucket.holidays.length > 0 ? `שבת ${bucket.holidays[0].title}` : 'שבת קודש');
        const specialSuffix =
          bucket.specialShabbat.length > 0 ? ` (${bucket.specialShabbat.join(', ')})` : '';
        const friCandleStr = prevBucket.candleLighting?.timeStr || '';
        const satHavdalahStr = bucket.havdalah?.timeStr || '';

        const timesBracket =
          friCandleStr && satHavdalahStr
            ? ` | כניסה: ${friCandleStr} • צאת שבת: ${satHavdalahStr}`
            : satHavdalahStr
            ? ` | צאת שבת: ${satHavdalahStr}`
            : '';

        const shabbatSummary = `📖 שבת ${parshaTitle}${specialSuffix}${timesBracket}`;
        const shabbatDesc = [
          `שבת קודש — ${parshaTitle}${specialSuffix}`,
          `תאריך עברי: ${hebrewDateFull}`,
          friCandleStr ? `🕯️ כניסת שבת והדלקת נרות (${city.name}): ${friCandleStr}` : '',
          satHavdalahStr ? `✨ צאת השבת והבדלה (${city.name}): ${satHavdalahStr}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        cal.createEvent({
          id: `shabbat-parsha-${dateKey}@family-zmanim`,
          start: startAllDayUtc,
          end: endAllDayUtc,
          allDay: true,
          sequence: dynamicSequence,
          stamp: now,
          lastModified: now,
          summary: shabbatSummary.normalize('NFKC'),
          description: shabbatDesc.normalize('NFKC'),
        });

        // Also add timed Havdalah event on Saturday evening if timedCandles is enabled
        if (options.timedCandles && bucket.havdalah) {
          const startHavdalah = bucket.havdalah.time;
          const endHavdalah = new Date(startHavdalah.getTime() + 30 * 60 * 1000);
          cal.createEvent({
            id: `shabbat-havdalah-${dateKey}@family-zmanim`,
            start: startHavdalah,
            end: endHavdalah,
            allDay: false,
            sequence: dynamicSequence,
            stamp: now,
            lastModified: now,
            summary: `✨ צאת שבת והבדלה • ${parshaTitle} (${bucket.havdalah.timeStr})`.normalize('NFKC'),
            description: `צאת השבת והבדלה (${city.name}): ${bucket.havdalah.timeStr}\n${parshaTitle}`.normalize(
              'NFKC'
            ),
          });
        }
      }
    }

    // =========================================================================
    // D. FAST DAYS (צומות ותעניות עם זמני כניסה ויציאה)
    // =========================================================================
    if (options.fasts && bucket.fasts.length > 0) {
      for (let fIdx = 0; fIdx < bucket.fasts.length; fIdx++) {
        const fast = bucket.fasts[fIdx];
        let timeSuffix = '';
        if (fast.startTimeStr && fast.endTimeStr) {
          timeSuffix = ` (תחילת הצום: ${fast.startTimeStr} • סיום הצום: ${fast.endTimeStr})`;
        } else if (fast.startTimeStr) {
          timeSuffix = ` (תחילת הצום: ${fast.startTimeStr})`;
        } else if (fast.endTimeStr) {
          timeSuffix = ` (סיום הצום: ${fast.endTimeStr})`;
        }

        const fastSummary = `⏳ ${fast.title}${timeSuffix}`;
        const fastDesc = [
          `${fast.title} — ${hebrewDateFull}`,
          fast.startTimeStr ? `🌅 תחילת הצום (${city.name}): ${fast.startTimeStr}` : '',
          fast.endTimeStr ? `✨ סיום הצום (${city.name}): ${fast.endTimeStr}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        cal.createEvent({
          id: `fast-${dateKey}-${fIdx}@family-zmanim`,
          start: startAllDayUtc,
          end: endAllDayUtc,
          allDay: true,
          sequence: dynamicSequence,
          stamp: now,
          lastModified: now,
          summary: fastSummary.normalize('NFKC'),
          description: fastDesc.normalize('NFKC'),
        });
      }
    }

    // =========================================================================
    // E. HOLIDAYS & CHAGIM (חגים ומועדים עם זמני כניסת וצאת החג)
    // =========================================================================
    if (options.holidays && bucket.holidays.length > 0) {
      for (let hIdx = 0; hIdx < bucket.holidays.length; hIdx++) {
        const hol = bucket.holidays[hIdx];
        const isErev = Boolean(hol.mask & flags.EREV);
        const isChag = Boolean(hol.mask & flags.CHAG);

        let timeInfo = '';
        if (isErev && bucket.candleLighting) {
          timeInfo = ` (הדלקת נרות: ${bucket.candleLighting.timeStr})`;
        } else if (isChag) {
          const prevCandle = prevBucket.candleLighting?.timeStr;
          const exitHavdalah = bucket.havdalah?.timeStr;
          if (prevCandle && exitHavdalah) {
            timeInfo = ` (כניסה: ${prevCandle} • צאת החג: ${exitHavdalah})`;
          } else if (exitHavdalah) {
            timeInfo = ` (צאת החג: ${exitHavdalah})`;
          }
        }

        const holSummary = `${hol.emoji} ${hol.title}${timeInfo}`;
        const holDesc = [
          `${hol.title} — ${hebrewDateFull}`,
          isErev && bucket.candleLighting
            ? `🕯️ הדלקת נרות וכניסת החג (${city.name}): ${bucket.candleLighting.timeStr}`
            : '',
          isChag && prevBucket.candleLighting
            ? `🕯️ כניסת החג בערב הקודם (${city.name}): ${prevBucket.candleLighting.timeStr}`
            : '',
          isChag && bucket.havdalah
            ? `✨ צאת החג והבדלה (${city.name}): ${bucket.havdalah.timeStr}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        cal.createEvent({
          id: `holiday-${dateKey}-${hIdx}@family-zmanim`,
          start: startAllDayUtc,
          end: endAllDayUtc,
          allDay: true,
          sequence: dynamicSequence,
          stamp: now,
          lastModified: now,
          summary: holSummary.normalize('NFKC'),
          description: holDesc.normalize('NFKC'),
        });
      }
    }

    // =========================================================================
    // F. ROSH CHODESH (ראשי חודשים)
    // =========================================================================
    if (options.roshChodesh && bucket.roshChodesh.length > 0) {
      const rcTitle = bucket.roshChodesh.join(' • ');
      cal.createEvent({
        id: `rosh-chodesh-${dateKey}@family-zmanim`,
        start: startAllDayUtc,
        end: endAllDayUtc,
        allDay: true,
        sequence: dynamicSequence,
        stamp: now,
        lastModified: now,
        summary: `🌒 ${rcTitle}`.normalize('NFKC'),
        description: `${rcTitle}\nתאריך עברי: ${hebrewDateFull}\nתזכורת: יעלה ויבוא בתפילה ובברכת המזון, הלל.`.normalize(
          'NFKC'
        ),
      });
    }

    // =========================================================================
    // G. OMER COUNT (ספירת העומר - אופציונלי)
    // =========================================================================
    if (options.omer && bucket.omer) {
      cal.createEvent({
        id: `omer-${dateKey}@family-zmanim`,
        start: startAllDayUtc,
        end: endAllDayUtc,
        allDay: true,
        sequence: dynamicSequence,
        stamp: now,
        lastModified: now,
        summary: `🌾 ספירת העומר: ${bucket.omer}`.normalize('NFKC'),
        description: `ספירת העומר ליום ${hebrewDateFull}: ${bucket.omer}`.normalize('NFKC'),
      });
    }
  }

  return cal.toString();
}
