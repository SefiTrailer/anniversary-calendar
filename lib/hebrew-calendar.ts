import { HDate, gematriya, months } from '@hebcal/core';

export interface DeceasedRecord {
  id: string;
  calendar_id: string;
  branch_id: string;
  branch_name?: string;
  title?: string;
  first_name: string;
  last_name: string;
  father_or_mother_name?: string; // e.g. "בן אברהם" או "בת שרה"
  gender?: 'male' | 'female';
  generation?: number;
  relationship?: string;
  hebrew_day?: number | null;
  hebrew_month?: string | null; // e.g. 'Adar', 'Nisan', 'Tishrei'
  hebrew_year?: number | null; // e.g. 5742
  gregorian_original_date?: string | null; // e.g. '1982-03-12'
  after_sunset?: boolean;
  leap_year_preference?: 'Adar II' | 'Adar I' | 'both';
  notes?: string;
  created_at?: string;
}

export const HEBREW_MONTHS_TRANSLATION: Record<string, string> = {
  'Tishrei': 'תשרי',
  'Cheshvan': 'חשוון',
  'Kislev': 'כסלו',
  'Tevet': 'טבת',
  'Sh\'vat': 'שבט',
  'Adar': 'אדר',
  'Adar I': 'אדר א׳',
  'Adar II': 'אדר ב׳',
  'Nisan': 'ניסן',
  'Iyyar': 'אייר',
  'Sivan': 'סיוון',
  'Tamuz': 'תמוז',
  'Av': 'אב',
  'Elul': 'אלול',
};

// Hebrew Month list for dropdowns
export const HEBREW_MONTHS_LIST = [
  { id: 'Tishrei', name: 'תשרי' },
  { id: 'Cheshvan', name: 'חשוון' },
  { id: 'Kislev', name: 'כסלו' },
  { id: 'Tevet', name: 'טבת' },
  { id: 'Sh\'vat', name: 'שבט' },
  { id: 'Adar', name: 'אדר (בשנה רגילה)' },
  { id: 'Adar I', name: 'אדר א׳ (בשנה מעוברת)' },
  { id: 'Adar II', name: 'אדר ב׳ (בשנה מעוברת)' },
  { id: 'Nisan', name: 'ניסן' },
  { id: 'Iyyar', name: 'אייר' },
  { id: 'Sivan', name: 'סיוון' },
  { id: 'Tamuz', name: 'תמוז' },
  { id: 'Av', name: 'אב' },
  { id: 'Elul', name: 'אלול' },
];

/**
 * Format Hebrew day number to Hebrew letters (e.g. 15 -> ט״ו)
 */
export function formatHebrewDay(day: number): string {
  try {
    return gematriya(day);
  } catch {
    return day.toString();
  }
}

/**
 * Format Hebrew year to Hebrew letters (e.g. 5742 -> תשמ״ב)
 */
export function formatHebrewYear(year: number): string {
  try {
    // gematriya for Hebrew year (5742 % 1000 = 742 -> תשמ״ב)
    const shortYear = year % 1000;
    return gematriya(shortYear);
  } catch {
    return year.toString();
  }
}

/**
 * Convert Gregorian date and afterSunset flag into Hebrew date details
 */
export function convertGregorianToHebrew(gregDateStr: string, afterSunset: boolean) {
  const [y, m, d] = gregDateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  let hDate = new HDate(dateObj);

  if (afterSunset) {
    hDate = hDate.next();
  }

  const day = hDate.getDate();
  const month = hDate.getMonthName();
  const year = hDate.getFullYear();

  return {
    hebrew_day: day,
    hebrew_month: month,
    hebrew_year: year,
    formatted_hebrew: formatHebrewDateString(day, month, year),
  };
}

/**
 * Format full Hebrew date string: "י״ז באדר תשמ״ב"
 */
export function formatHebrewDateString(day: number, monthName: string, year: number): string {
  const dayStr = formatHebrewDay(day);
  const monthHeb = HEBREW_MONTHS_TRANSLATION[monthName] || monthName;
  const yearStr = formatHebrewYear(year);
  return `${dayStr} ב${monthHeb} ${yearStr}`;
}

/**
 * Format full display string according to user requirement:
 * Hebrew date is primary, original Gregorian date in parentheses only!
 * Example: י״ג באדר תשמ״ב (12/03/1982)
 */
export function formatDisplayDateWithGregorian(
  hebrew_day?: number | null,
  hebrew_month?: string | null,
  hebrew_year?: number | null,
  gregorian_original_date?: string | null
): string {
  if (!hebrew_day || !hebrew_month) {
    if (hebrew_month && hebrew_year) {
      return `חודש ${hebrew_month} ${formatHebrewYear(hebrew_year)} (יום לא אומת)`;
    }
    return 'ללא תאריך (להשלמה)';
  }
  const hebFormatted = formatHebrewDateString(hebrew_day, hebrew_month, hebrew_year || 5700);
  if (!gregorian_original_date) {
    return hebFormatted;
  }

  // Format YYYY-MM-DD to DD/MM/YYYY
  const parts = gregorian_original_date.split('-');
  let gregDisplay = gregorian_original_date;
  if (parts.length === 3) {
    gregDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return `${hebFormatted} (${gregDisplay})`;
}

export interface UpcomingYahrzeit {
  hebrewYear: number;
  hebrewDateStr: string;
  gregorianDate: Date;
  gregorianDateStr: string; // YYYY-MM-DD
  yearsPassed: number;
}

/**
 * Calculates upcoming Yahrzeits for a deceased person for the given number of years.
 */
export function calculateUpcomingYahrzeits(deceased: DeceasedRecord, countYears: number = 10): UpcomingYahrzeit[] {
  if (!deceased.hebrew_day || !deceased.hebrew_month) {
    return [];
  }
  const results: UpcomingYahrzeit[] = [];
  const currentHDate = new HDate();
  const currentYear = currentHDate.getFullYear();

  for (let i = 0; i < countYears; i++) {
    const targetYear = currentYear + i;
    const isTargetLeap = HDate.isLeapYear(targetYear);
    let targetMonth = deceased.hebrew_month;

    // Handle Adar in leap years
    if (deceased.hebrew_month === 'Adar') {
      if (isTargetLeap) {
        // Default halacha is Adar II for Ashkenazim/standard
        targetMonth = deceased.leap_year_preference === 'Adar I' ? 'Adar I' : 'Adar II';
      }
    } else if (deceased.hebrew_month === 'Adar I' || deceased.hebrew_month === 'Adar II') {
      if (!isTargetLeap) {
        targetMonth = 'Adar';
      }
    }

    try {
      // Create HDate for the yahrzeit in target year
      // Some months have 29 or 30 days. Cap day if month is shorter.
      const tempHDate = new HDate(1, targetMonth, targetYear);
      const daysInTargetMonth = tempHDate.daysInMonth();
      const safeDay = Math.min(deceased.hebrew_day, daysInTargetMonth);

      const yahrzeitHDate = new HDate(safeDay, targetMonth, targetYear);
      const greg = yahrzeitHDate.greg();
      const yearsPassed = deceased.hebrew_year ? targetYear - deceased.hebrew_year : 0;

      const yStr = greg.getFullYear();
      const mStr = String(greg.getMonth() + 1).padStart(2, '0');
      const dStr = String(greg.getDate()).padStart(2, '0');

      results.push({
        hebrewYear: targetYear,
        hebrewDateStr: formatHebrewDateString(safeDay, targetMonth, targetYear),
        gregorianDate: greg,
        gregorianDateStr: `${yStr}-${mStr}-${dStr}`,
        yearsPassed: Math.max(0, yearsPassed),
      });
    } catch (err) {
      console.error(`Error calculating yahrzeit for year ${targetYear}:`, err);
    }
  }

  return results;
}

export function formatAnniversaryYearText(yearsPassed: number): string {
  if (yearsPassed <= 0) return 'שנת הפטירה';
  if (yearsPassed === 1) return 'יום השנה הראשון';
  if (yearsPassed === 2) return 'שנתיים לפטירה';
  return `שנת ה-${yearsPassed} לפטירה`;
}

/**
 * Generates a direct 1-click Google Calendar add URL for an upcoming Yahrzeit event.
 */
export function getGoogleCalendarDirectAddUrl(
  person: DeceasedRecord,
  upcoming: UpcomingYahrzeit,
  branchName?: string
): string {
  const titlePrefix = person.title ? `${person.title} ` : '';
  const isMartyr = person.notes?.includes('הי"ד') || person.last_name?.includes('הי"ד');
  const honorific = isMartyr ? 'הי"ד' : (person.gender === 'female' || person.title === 'מרת' ? 'ע"ה' : 'ז"ל');
  const displayName = `${titlePrefix}${person.first_name} ${person.last_name}`.trim();
  const title = `יארצייט: ${displayName} ${honorific} (${formatAnniversaryYearText(upcoming.yearsPassed)})`;
  const originalDate = formatDisplayDateWithGregorian(
    person.hebrew_day,
    person.hebrew_month,
    person.hebrew_year,
    person.gregorian_original_date
  );

  const relationLine = person.relationship 
    ? `קרבה לבעל היומן: ${person.relationship}${person.generation ? ` (דור ${person.generation} מעל בעל היומן)` : ''}`
    : (person.generation ? `דור ${person.generation} במשפחה` : '');

  const details = [
    `יום השנה לפטירת ${displayName} ${honorific}`,
    relationLine,
    `תאריך עברי מקורי: ${originalDate}`,
    branchName ? `ענף משפחתי: ${branchName}` : '',
    person.notes ? `הערות ומנהגים: ${person.notes}` : '',
    person.after_sunset ? 'הערה: הפטירה אירעה לאחר צאת הכוכבים / השקיעה.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const start = new Date(upcoming.gregorianDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const startStr = start.toISOString().slice(0, 10).replace(/-/g, '');
  const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Checks for conflicts or discrepancies when adding or updating a deceased record.
 * Detects if a person with the same First Name and Last Name already exists in the calendar,
 * and whether the dates match or conflict.
 */
export function checkDuplicateOrDiscrepancy(
  existingRecords: DeceasedRecord[],
  newRecord: Partial<DeceasedRecord>,
  excludeId?: string
) {
  const normFirst = (newRecord.first_name || '').trim().toLowerCase();
  const normLast = (newRecord.last_name || '').trim().toLowerCase();

  if (!normFirst || !normLast) return null;

  const match = existingRecords.find(r => {
    if (excludeId && r.id === excludeId) return false;
    return (
      r.first_name.trim().toLowerCase() === normFirst &&
      r.last_name.trim().toLowerCase() === normLast
    );
  });

  if (!match) return null;

  // Check if dates are identical
  const isDateIdentical =
    match.hebrew_day === newRecord.hebrew_day &&
    match.hebrew_month === newRecord.hebrew_month &&
    match.hebrew_year === newRecord.hebrew_year;

  if (isDateIdentical) {
    return {
      type: 'duplicate' as const,
      matchedRecord: match,
      message: `נפטר בשם "${match.first_name} ${match.last_name}" כבר קיים במערכת עם תאריך זהה (${formatDisplayDateWithGregorian(match.hebrew_day, match.hebrew_month, match.hebrew_year, match.gregorian_original_date)}).`,
    };
  }

  return {
    type: 'discrepancy' as const,
    matchedRecord: match,
    message: `שים לב: קיים כבר נפטר בשם "${match.first_name} ${match.last_name}" עם תאריך פטירה שונה: ${formatDisplayDateWithGregorian(match.hebrew_day, match.hebrew_month, match.hebrew_year, match.gregorian_original_date)}. האם מדובר באותו אדם עם תאריך מעודכן, או בנפטר אחר בעל שם זהה?`,
  };
}
