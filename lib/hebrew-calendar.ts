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

export const HEBREW_TO_HEBCAL_MONTH: Record<string, string> = {
  'תשרי': 'Tishrei',
  'חשוון': 'Cheshvan',
  'חשון': 'Cheshvan',
  'כסלו': 'Kislev',
  'טבת': 'Tevet',
  'שבט': 'Sh\'vat',
  'אדר': 'Adar',
  'אדר א׳': 'Adar I',
  'אדר א': 'Adar I',
  'אדר ב׳': 'Adar II',
  'אדר ב': 'Adar II',
  'ניסן': 'Nisan',
  'אייר': 'Iyyar',
  'סיוון': 'Sivan',
  'סיון': 'Sivan',
  'תמוז': 'Tamuz',
  'אב': 'Av',
  'אלול': 'Elul',
};

/**
 * Format Hebrew day number to Hebrew letters (e.g. 15 -> ט״ו)
 */
export function formatHebrewDay(day?: number | null): string {
  if (!day || isNaN(day) || day <= 0) return '';
  try {
    return gematriya(day);
  } catch {
    return String(day);
  }
}

/**
 * Format Hebrew year to Hebrew letters (e.g. 5742 -> תשמ״ב)
 */
export function formatHebrewYear(year?: number | null): string {
  if (!year || isNaN(year) || year <= 0) return '';
  try {
    // gematriya for Hebrew year (5742 % 1000 = 742 -> תשמ״ב)
    const shortYear = year >= 1000 ? year % 1000 : year;
    return gematriya(shortYear);
  } catch {
    return String(year);
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
export function formatHebrewDateString(
  day?: number | null,
  monthName?: string | null,
  year?: number | null
): string {
  const dayStr = formatHebrewDay(day);
  const monthHeb = monthName ? (HEBREW_MONTHS_TRANSLATION[monthName] || monthName) : '';
  const yearStr = formatHebrewYear(year);

  if (!dayStr && !monthHeb && !yearStr) return '';
  if (!dayStr && monthHeb) return `חודש ${monthHeb}${yearStr ? ` ${yearStr}` : ''}`;
  if (dayStr && !monthHeb) return dayStr;
  return `${dayStr} ב${monthHeb}${yearStr ? ` ${yearStr}` : ''}`;
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
      const monthHeb = HEBREW_MONTHS_TRANSLATION[hebrew_month] || hebrew_month;
      const yearStr = formatHebrewYear(hebrew_year);
      return `חודש ${monthHeb} ${yearStr} (יום לא אומת)`;
    }
    if (hebrew_month) {
      const monthHeb = HEBREW_MONTHS_TRANSLATION[hebrew_month] || hebrew_month;
      return `חודש ${monthHeb} (יום ושנה לא אומתו)`;
    }
    if (hebrew_year) {
      return `שנת ${formatHebrewYear(hebrew_year)} (יום וחודש טרם אומתו)`;
    }
    return 'ללא תאריך (להשלמה)';
  }

  const hebFormatted = formatHebrewDateString(hebrew_day, hebrew_month, hebrew_year);
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
export function calculateUpcomingYahrzeits(
  deceased: DeceasedRecord,
  countYears: number = 10,
  includePassedThisYear: boolean = false
): UpcomingYahrzeit[] {
  if (!deceased || !deceased.hebrew_day || !deceased.hebrew_month) {
    return [];
  }
  const results: UpcomingYahrzeit[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentHDate = new HDate(today);
  const currentYear = currentHDate.getFullYear();

  // Normalize month name to English standard Hebcal name
  const rawMonth = String(deceased.hebrew_month).trim();
  const baseMonth = HEBREW_TO_HEBCAL_MONTH[rawMonth] || rawMonth;

  // Check if this year's yahrzeit has already passed; if so and includePassedThisYear is false, start from next year
  const maxOffset = countYears + 1;
  for (let i = 0; i < maxOffset && results.length < countYears; i++) {
    const targetYear = currentYear + i;
    const isTargetLeap = HDate.isLeapYear(targetYear);
    let targetMonth = baseMonth;

    // Handle Adar in leap years
    if (baseMonth === 'Adar') {
      if (isTargetLeap) {
        // Default halacha is Adar II for Ashkenazim/standard
        targetMonth = deceased.leap_year_preference === 'Adar I' ? 'Adar I' : 'Adar II';
      }
    } else if (baseMonth === 'Adar I' || baseMonth === 'Adar II') {
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
      greg.setHours(0, 0, 0, 0);

      if (!includePassedThisYear && greg.getTime() < today.getTime()) {
        continue;
      }

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
      console.warn(`Could not compute yahrzeit for ${deceased.first_name} ${deceased.last_name} in year ${targetYear}:`, err);
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

// Boundary-safe pattern for Hebrew honorifics (prevents matching 'זל' inside 'זלמן' or 'זליג')
const SAFE_HONORIFIC_PATTERN = /(?<=^|[\s,;.(])(?:זצוקללה[״"׳']ה|זצוק[״"׳']ל|זצוקל|זצ[״"׳']ל|זצל|זי[״"׳']ע|זיע|הי[״"׳']ד|היד|ע[״"׳']ה|עה|נ[״"׳']ע|תנצב[״"׳']ה|ז[״"׳']ל|זל)(?=$|[\s,;.)])/g;

export interface DeceasedFormattedParts {
  cleanTitle: string;
  showTitle: boolean;
  cleanFirstName: string;
  cleanLastName: string;
  honorific: string;
  fullName: string;
  fullNameWithoutTitle: string;
}

function cleanHonorificsFromString(str: string): string {
  if (!str) return '';
  return str
    .replace(SAFE_HONORIFIC_PATTERN, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

/**
 * Extracts and cleans honorifics (זצ"ל, ז"ל, ע"ה, הי"ד, etc.) from deceased record.
 * Prevents duplications like "זצ"ל ז"ל" or "ע"ה ז"ל".
 * Appropriately defaults to "ע״ה" for women, "הי״ד" for martyrs, and "ז״ל" / "זצ״ל" for men.
 */
export function getDeceasedFormattedParts(person: {
  title?: string | null;
  first_name: string;
  last_name: string;
  gender?: 'male' | 'female' | string;
  notes?: string | null;
}): DeceasedFormattedParts {
  let cleanTitle = (person.title || '').trim();
  let cleanFirstName = (person.first_name || '').trim();
  let cleanLastName = (person.last_name || '').trim();

  // 1. Scan the whole name text for any existing honorifics
  const fullRaw = `${cleanTitle} ${cleanFirstName} ${cleanLastName}`;
  const foundHonorifics = fullRaw.match(SAFE_HONORIFIC_PATTERN) || [];
  let unique = Array.from(new Set(foundHonorifics.map((h) => h.replace(/["׳']/g, '״'))));

  // Determine highest/proper honorific
  let extractedHonorific = '';
  if (unique.includes('הי״ד')) {
    extractedHonorific = 'הי״ד';
  } else if (unique.includes('זצוק״ל') || unique.includes('זצוקל') || unique.includes('זצוקללה״ה') || unique.includes('זצ״ל') || unique.includes('זצל')) {
    extractedHonorific = 'זצ״ל';
  } else if (unique.includes('זי״ע') || unique.includes('זיע')) {
    extractedHonorific = 'זי״ע';
  } else if (unique.includes('ע״ה') || unique.includes('עה') || unique.includes('נ״ע')) {
    extractedHonorific = 'ע״ה';
  } else if (unique.includes('ז״ל') || unique.includes('זל')) {
    extractedHonorific = 'ז״ל';
  }

  // 2. Strip ALL honorifics from title, first_name and last_name so they never appear twice
  cleanFirstName = cleanHonorificsFromString(cleanFirstName);
  cleanLastName = cleanHonorificsFromString(cleanLastName);
  cleanTitle = cleanHonorificsFromString(cleanTitle);

  // 3. If no honorific was present, choose appropriate default
  if (!extractedHonorific) {
    const isMartyr =
      person.notes?.includes('הי"ד') ||
      person.notes?.includes('הי״ד') ||
      person.title?.includes('הקדוש') ||
      person.title?.includes('הקדושה');

    const isFemale =
      person.gender === 'female' ||
      person.title === 'מרת' ||
      person.title === 'הרבנית' ||
      person.title === 'העלמה' ||
      cleanTitle.startsWith('מרת') ||
      cleanTitle.startsWith('הרבנית');

    if (isMartyr) {
      extractedHonorific = 'הי״ד';
    } else if (isFemale) {
      extractedHonorific = 'ע״ה';
    } else if (
      cleanTitle.includes('הגאון') ||
      cleanTitle.includes('אדמו״ר') ||
      cleanTitle.includes('אדמו"ר')
    ) {
      extractedHonorific = 'זצ״ל';
    } else {
      extractedHonorific = 'ז״ל';
    }
  }

  // Determine if title should be displayed separately or if it is already part of the name
  const hasTitleInFn = Boolean(
    cleanTitle && (
      cleanFirstName.startsWith(cleanTitle) ||
      cleanFirstName.startsWith('רבי ') ||
      cleanFirstName.startsWith('ר\' ') ||
      cleanFirstName.startsWith('ר״ ') ||
      cleanFirstName.startsWith('הקצין רבי') ||
      cleanFirstName.startsWith('הגאון') ||
      cleanFirstName.startsWith('הרב ') ||
      cleanFirstName.startsWith('מרת ') ||
      cleanFirstName.startsWith('הקדוש') ||
      cleanFirstName.startsWith('הקדושה') ||
      cleanFirstName.startsWith('החסיד') ||
      cleanFirstName.startsWith('הגה״ק') ||
      cleanFirstName.startsWith('הגה"ק') ||
      cleanFirstName.startsWith('אדמו״ר') ||
      cleanFirstName.startsWith('אדמו"ר')
    )
  );
  const showTitle = Boolean(cleanTitle && !hasTitleInFn);
  const prefix = showTitle ? `${cleanTitle} ` : '';
  const fullNameWithoutTitle = `${cleanFirstName} ${cleanLastName} ${extractedHonorific}`.trim();
  const fullName = `${prefix}${cleanFirstName} ${cleanLastName} ${extractedHonorific}`.trim();

  return {
    cleanTitle,
    showTitle,
    cleanFirstName,
    cleanLastName,
    honorific: extractedHonorific,
    fullName,
    fullNameWithoutTitle,
  };
}

/**
 * Formats "לעילוי נשמת" following Jewish tradition and user specifications:
 * Shows the deceased's name followed by father/mother connector:
 * e.g., "לעילוי נשמת: [שם הנפטר] בן/בת [שם ההורה]".
 */
export function formatLeiluyNishmat(person: {
  title?: string | null;
  first_name: string;
  last_name: string;
  gender?: 'male' | 'female' | string;
  father_or_mother_name?: string | null;
  notes?: string | null;
}): string {
  const parent = (person.father_or_mother_name || '').trim();
  if (!parent) return '';

  const { cleanTitle, showTitle, cleanFirstName, cleanLastName } = getDeceasedFormattedParts(person);
  const nameParts = [showTitle ? cleanTitle : '', cleanFirstName, cleanLastName].filter(Boolean);
  const deceasedName = nameParts.join(' ').replace(/\s+/g, ' ').trim();

  // If parent already starts with 'בן ', 'בת ', 'בר '
  if (/^(?:בן|בת|בר)\s+/i.test(parent)) {
    return `${deceasedName} ${parent}`;
  }

  const connector = person.gender === 'female' ? 'בת' : 'בן';
  return `${deceasedName} ${connector} ${parent}`;
}

/**
 * Returns the formatted full name with title, clean names, and a single deduplicated honorific.
 */
export function getDeceasedFullName(person: {
  title?: string | null;
  first_name: string;
  last_name: string;
  gender?: 'male' | 'female' | string;
  notes?: string | null;
}): string {
  return getDeceasedFormattedParts(person).fullName;
}

/**
 * Formats a textual lineage chain (e.g. Sefi ➔ Michael ➔ Emanuel ➔ ...)
 */
export function formatLineageChainText(lineagePath?: any[] | null): string {
  if (!Array.isArray(lineagePath) || lineagePath.length === 0) return '';
  return lineagePath.map((s) => s.name || s).join(' ➔ ');
}

export interface GenerationRelationInfo {
  generation: number; // Base generation in DB (1 = Sefi, 2 = parents, 3 = grandparents...)
  relativeGeneration: number; // Calculated generation relative to current viewer/user!
  isDirect: boolean;
  relationDescription: string;
  directType: string;
  badgeText: string; // Concise: "דור X" or "דור X • לא ישיר"
  fullDescription: string;
}

/**
 * Returns detailed generation and relationship information connecting the deceased person to the current viewer/user.
 * Distinguishes between direct ancestors (אב/אם קדמוני ישיר) and collateral/non-direct relatives (דוד, דודה, אחות סבא, וכו').
 * Adjusts generation dynamically based on userGeneration (root user Sefi = 1, children = 0, grandchildren = -1, parents = 2).
 */
export function getGenerationRelationInfo(
  person: {
    generation?: number | null;
    relationship?: string | null;
    lineage_path?: any[] | null;
  },
  userGeneration: number = 1
): GenerationRelationInfo {
  const baseGen =
    person.generation ||
    (Array.isArray(person.lineage_path) && person.lineage_path.length > 0
      ? person.lineage_path.length
      : 2);
  const rel = (person.relationship || '').trim();

  // Calculate relative generation:
  // Root user (Sefi) = 1 -> relGen = baseGen + (1 - 1) = baseGen
  // Sefi's child = 0 -> relGen = baseGen + (1 - 0) = baseGen + 1 (descendant generation 6 of gen 5)
  // Sefi's father = 2 -> relGen = baseGen + (1 - 2) = baseGen - 1
  const effectiveUserGen = typeof userGeneration === 'number' && !isNaN(userGeneration) ? userGeneration : 1;
  const relativeGeneration = Math.max(1, baseGen + (1 - effectiveUserGen));

  const nonDirectKeywords = [
    'דודה',
    'דודת',
    'דוד-רבא',
    'דוד סבא',
    'דוד סבתא',
    'אחות סבא',
    'אחות סבתא',
    'אחות סבא-רבא',
    'אחות האם',
    'אחות האב',
    'אחי סבא',
    'אחי סבא-רבא',
    'קרוב משפחה',
    'קרובת משפחה',
    'בן דוד',
    'בת דוד',
  ];

  let isDirect = true;
  for (const kw of nonDirectKeywords) {
    if (rel.includes(kw)) {
      isDirect = false;
      break;
    }
  }

  if (
    isDirect &&
    (rel.startsWith('דוד ') ||
      rel.startsWith('דודה ') ||
      rel.startsWith('אחי ') ||
      rel.startsWith('אחות '))
  ) {
    isDirect = false;
  }

  let directType = 'אב/אם קדמוני';
  if (baseGen === 2) {
    directType =
      rel.includes('אם') || rel.includes('אמא')
        ? 'אם'
        : rel.includes('אב') || rel.includes('אבא')
        ? 'אב'
        : 'הורים';
  } else if (baseGen === 3) {
    directType = rel.includes('סבתא')
      ? 'סבתא'
      : rel.includes('סבא')
      ? 'סבא'
      : 'סבא/סבתא';
  } else if (baseGen === 4) {
    directType = rel.includes('סבתא')
      ? 'סבתא-רבתא'
      : rel.includes('סבא')
      ? 'סבא-רבא'
      : 'סבא-רבא/סבתא-רבתא';
  } else if (baseGen === 5) {
    directType = rel.includes('סבתא')
      ? 'סבתא-רבא-רבא'
      : rel.includes('סבא')
      ? 'סבא-רבא-רבא'
      : 'סבא-רבא-רבא';
  } else {
    directType = rel.includes('אם') ? 'אם קדמונית' : 'אב קדמון';
  }

  const relationDescription = rel || (isDirect ? directType : 'קשר משפחתי');

  // Concise badge text as requested by user: 'רק כ'דור...''
  const badgeText = isDirect
    ? `דור ${relativeGeneration}`
    : `דור ${relativeGeneration} • לא ישיר`;

  const fullDescription = isDirect
    ? `אתה צאצא דור ${relativeGeneration} של דמות זו בקשר ישיר של אב/אם קדמוני (${relationDescription})`
    : `דמות זו מקושרת לענף בדור ${relativeGeneration}, אך אינה קשר ישיר של אב/אם קדמוני (${relationDescription})`;

  return {
    generation: baseGen,
    relativeGeneration,
    isDirect,
    relationDescription,
    directType,
    badgeText,
    fullDescription,
  };
}

/**
 * Generates a direct 1-click Google Calendar add URL for an upcoming Yahrzeit event.
 */
export function getGoogleCalendarDirectAddUrl(
  person: DeceasedRecord & { lineage_path?: any[] },
  upcoming: UpcomingYahrzeit,
  branchName?: string,
  appOrigin?: string
): string {
  const fullDisplayName = getDeceasedFullName(person);
  const title = `יארצייט: ${fullDisplayName} (${formatAnniversaryYearText(upcoming.yearsPassed)})`;
  const originalDate = formatDisplayDateWithGregorian(
    person.hebrew_day,
    person.hebrew_month,
    person.hebrew_year,
    person.gregorian_original_date
  );

  const genInfo = getGenerationRelationInfo(person);
  const relationLine = `קרבה לבעל היומן: ${genInfo.fullDescription}`;

  const lineageChain = formatLineageChainText(person.lineage_path);
  const lineageUrl = appOrigin && person.id ? `${appOrigin}?lineage=${person.id}` : '';

  const details = [
    `יום השנה לפטירת ${fullDisplayName}`,
    relationLine,
    `תאריך עברי מקורי: ${originalDate}`,
    branchName ? `ענף משפחתי: ${branchName}` : '',
    lineageChain ? `\n🔗 שרשרת היוחסין:\n${lineageChain}` : '',
    lineageUrl ? `\nצפייה בשרשרת הייחוס המלאה באילן:\n${lineageUrl}` : '',
    person.notes ? `\nהערות ומנהגים: ${person.notes}` : '',
    person.after_sunset ? 'הערה: הפטירה אירעה לאחר צאת הכוכבים / השקיעה.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const [y, m, d] = (upcoming.gregorianDateStr || '').split('-').map(Number);
  let startStr: string;
  let endStr: string;
  if (y && m && d) {
    const startUtc = new Date(Date.UTC(y, m - 1, d));
    const endUtc = new Date(Date.UTC(y, m - 1, d + 1));
    startStr = startUtc.toISOString().slice(0, 10).replace(/-/g, '');
    endStr = endUtc.toISOString().slice(0, 10).replace(/-/g, '');
  } else {
    const start = new Date(upcoming.gregorianDate);
    const sy = start.getFullYear();
    const sm = String(start.getMonth() + 1).padStart(2, '0');
    const sd = String(start.getDate()).padStart(2, '0');
    startStr = `${sy}${sm}${sd}`;
    const end = new Date(sy, start.getMonth(), start.getDate() + 1);
    endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
  }

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

export interface SubBranchNode {
  id: string; // canonical step name or node key
  label: string; // clean display label
  shortLabel: string;
  gen: 2 | 3 | 4;
  gender?: 'male' | 'female';
  parentId?: string;
  count: number;
  children: SubBranchNode[];
}

export interface BranchHierarchy {
  mainBranches: SubBranchNode[]; // Gen 2 (e.g. צד אבא / צד אמא)
  grandparentBranches: SubBranchNode[]; // Gen 3 (סבא וסבתא)
  greatGrandparentBranches: SubBranchNode[]; // Gen 4 (סבא-רבא וסבתא-רבתא — נעצר בדור זה)
  allNodesById: Record<string, SubBranchNode>;
}

/**
  * Normalizes a lineage step name into a stable canonical key & label for Gen 2, Gen 3, and Gen 4.
  * Works dynamically for any family directly from the database lineage_path.
  */
export function getPersonLineageBranchKeys(
  person: DeceasedRecord & { lineage_path?: any[] },
  branches?: { id: string; name: string }[]
): {
  gen2Key: string | null;
  gen2Label: string | null;
  gen2Short: string | null;
  gen3Key: string | null;
  gen3Label: string | null;
  gen3Short: string | null;
  gen4Key: string | null;
  gen4Label: string | null;
  gen4Short: string | null;
} {
  const lp = Array.isArray(person.lineage_path) ? person.lineage_path : [];

  const step2 =
    lp.find(
      (s: any) =>
        Number(s?.gen) === 2 &&
        !String(s?.relation || '').includes('דודה') &&
        !String(s?.relation || '').includes('דוד')
    ) || lp.find((s: any) => Number(s?.gen) === 2);
  const step3 =
    lp.find(
      (s: any) =>
        Number(s?.gen) === 3 &&
        !String(s?.relation || '').includes('אחות') &&
        !String(s?.relation || '').includes('אחי')
    ) || lp.find((s: any) => Number(s?.gen) === 3);
  const step4 =
    lp.find(
      (s: any) =>
        Number(s?.gen) === 4 &&
        !String(s?.relation || '').includes('אחות') &&
        !String(s?.relation || '').includes('אחי') &&
        !String(s?.relation || '').includes('משפחת')
    ) || lp.find((s: any) => Number(s?.gen) === 4);

  let gen2Key: string | null = null;
  let gen2Label: string | null = null;
  let gen2Short: string | null = null;

  const s2Name = String(step2?.name || step2?.person_name || '').trim();
  const branchObj = branches?.find((b) => b.id === person.branch_id);
  const branchName = branchObj?.name || person.branch_name || '';

  if (s2Name) {
    const rel2 = String(step2?.relation || '');
    const isPaternal = step2?.gender === 'male' || rel2.includes('אב');
    const isMaternal = step2?.gender === 'female' || rel2.includes('אם');
    const sidePrefix = isPaternal ? 'צד אבא' : isMaternal ? 'צד אמא' : 'ענף מרכזי';
    const sideTag = isPaternal ? 'פטרנלי:' : isMaternal ? 'מטרנלי:' : '';
    gen2Key = `gen2:${sideTag}${s2Name}`;
    gen2Label = `${sidePrefix} • ${s2Name}`;
    gen2Short = `${sidePrefix} (${s2Name})`;
  } else if (branchName) {
    gen2Key = `gen2:${branchName}`;
    gen2Label = branchName;
    gen2Short = branchName;
  }

  let gen3Key: string | null = null;
  let gen3Label: string | null = null;
  let gen3Short: string | null = null;

  const s3Name = String(step3?.name || step3?.person_name || '').trim();
  const s3Rel = String(step3?.relation || '');
  if (s3Name && !s3Rel.includes('אחות ') && !s3Rel.includes('אחי ')) {
    const isGrandfather = step3?.gender === 'male' || s3Rel.includes('סבא');
    const isGrandmother = step3?.gender === 'female' || s3Rel.includes('סבתא');
    const gpPrefix = isGrandfather ? 'סבא' : isGrandmother ? 'סבתא' : '';
    gen3Key = `gen3:${s3Name}`;
    gen3Label = gpPrefix && !s3Name.startsWith(gpPrefix) ? `${gpPrefix} ${s3Name}` : s3Name;
    gen3Short = gen3Label;
  }

  let gen4Key: string | null = null;
  let gen4Label: string | null;
  let gen4Short: string | null;
  gen4Label = null;
  gen4Short = null;

  const s4Name = String(step4?.name || step4?.person_name || '').trim();
  const s4Rel = String(step4?.relation || '');
  if (s4Name && !s4Rel.includes('אחות ') && !s4Rel.includes('אחי ') && !s4Rel.includes('משפחת ')) {
    const isGreatGrandfather = step4?.gender === 'male' || s4Rel.includes('סבא');
    const isGreatGrandmother = step4?.gender === 'female' || s4Rel.includes('סבתא');
    const ggpPrefix = isGreatGrandfather ? 'סבא-רבא' : isGreatGrandmother ? 'סבתא-רבתא' : '';
    gen4Key = `gen4:${s4Name}`;
    gen4Label = ggpPrefix && !s4Name.startsWith(ggpPrefix) ? `${ggpPrefix} ${s4Name}` : s4Name;
    gen4Short = s4Name;
  }

  return {
    gen2Key,
    gen2Label,
    gen2Short,
    gen3Key,
    gen3Label,
    gen3Short,
    gen4Key,
    gen4Label,
    gen4Short,
  };
}

/**
  * Builds the 3-level branch hierarchy (stopping at Generation 4: Great-Grandparents):
  * - Gen 2: Main Branch (ענף מרכזי — צד אבא / צד אמא)
  * - Gen 3: Grandparent Sub-Branch (תת-ענף סבא וסבתא)
  * - Gen 4: Great-Grandparent Sub-Branch (תת-ענף סבא-רבא וסבתא-רבתא)
  */
export function extractBranchHierarchy(
  deceasedList: (DeceasedRecord & { lineage_path?: any[] })[],
  branches?: { id: string; name: string }[]
): BranchHierarchy {
  const allNodesById: Record<string, SubBranchNode> = {};
  const mainBranches: SubBranchNode[] = [];
  const grandparentBranches: SubBranchNode[] = [];
  const greatGrandparentBranches: SubBranchNode[] = [];

  for (const person of deceasedList) {
    const keys = getPersonLineageBranchKeys(person, branches);

    if (keys.gen2Key && keys.gen2Label && keys.gen2Short) {
      if (!allNodesById[keys.gen2Key]) {
        const node2: SubBranchNode = {
          id: keys.gen2Key,
          label: keys.gen2Label,
          shortLabel: keys.gen2Short,
          gen: 2,
          count: 0,
          children: [],
        };
        allNodesById[keys.gen2Key] = node2;
        mainBranches.push(node2);
      }
      allNodesById[keys.gen2Key].count++;
    }

    if (keys.gen3Key && keys.gen3Label && keys.gen3Short && keys.gen2Key) {
      if (!allNodesById[keys.gen3Key]) {
        const node3: SubBranchNode = {
          id: keys.gen3Key,
          label: keys.gen3Label,
          shortLabel: keys.gen3Short,
          gen: 3,
          parentId: keys.gen2Key,
          count: 0,
          children: [],
        };
        allNodesById[keys.gen3Key] = node3;
        grandparentBranches.push(node3);
        allNodesById[keys.gen2Key]?.children.push(node3);
      }
      allNodesById[keys.gen3Key].count++;
    }

    if (keys.gen4Key && keys.gen4Label && keys.gen4Short && keys.gen3Key) {
      if (!allNodesById[keys.gen4Key]) {
        const node4: SubBranchNode = {
          id: keys.gen4Key,
          label: keys.gen4Label,
          shortLabel: keys.gen4Short,
          gen: 4,
          parentId: keys.gen3Key,
          count: 0,
          children: [],
        };
        allNodesById[keys.gen4Key] = node4;
        greatGrandparentBranches.push(node4);
        allNodesById[keys.gen3Key]?.children.push(node4);
      }
      allNodesById[keys.gen4Key].count++;
    }
  }

  // Sort main branches so Paternal (אבא) is first, Maternal (אמא) is second
  mainBranches.sort((a, b) => {
    if (a.id.includes('פטרנלי')) return -1;
    if (b.id.includes('פטרנלי')) return 1;
    return b.count - a.count;
  });

  return {
    mainBranches,
    grandparentBranches,
    greatGrandparentBranches,
    allNodesById,
  };
}

/**
  * Checks whether a deceased record belongs to a selected hierarchical branch filter key
  * (`gen2:...`, `gen3:...`, `gen4:...`, or legacy `branch_id` / `'all'`).
  */
export function matchesBranchHierarchyFilter(
  person: DeceasedRecord & { lineage_path?: any[] },
  filterKey: string,
  branches?: { id: string; name: string }[]
): boolean {
  if (!filterKey || filterKey === 'all') return true;

  if (filterKey.startsWith('gen2:') || filterKey.startsWith('gen3:') || filterKey.startsWith('gen4:')) {
    const keys = getPersonLineageBranchKeys(person, branches);
    if (filterKey.startsWith('gen2:')) return keys.gen2Key === filterKey;
    if (filterKey.startsWith('gen3:')) return keys.gen3Key === filterKey;
    if (filterKey.startsWith('gen4:')) return keys.gen4Key === filterKey;
  }

  // Legacy branch_id UUID match
  return person.branch_id === filterKey;
}

