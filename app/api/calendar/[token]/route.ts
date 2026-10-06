import { NextRequest, NextResponse } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { DataStore } from '@/lib/data-store';
import {
  calculateUpcomingYahrzeits,
  formatDisplayDateWithGregorian,
  getDeceasedFullName,
  formatLineageChainText,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
  matchesBranchHierarchyFilter,
  formatCalendarDisplayName,
  formatSimchaCalendarDisplayName,
  formatCalendarDescription,
  isPersonLiving,
  getSimchaType,
  cleanLivingMarkerFromText,
  getHalachicYahrzeitTimes,
} from '@/lib/hebrew-calendar';
import {
  parseHebrewCalendarQueryParams,
  generateHebrewCalendarIcs,
} from '@/lib/hebrew-dates-calendar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, '');

  // Public automatic Hebrew Dates, Shabbatot, Fasts, Holidays & Zmanim calendar feed (no registration required)
  if (token === 'hebrew' || token === 'hebrew-calendar' || token === 'hebrew-dates') {
    const hebOptions = parseHebrewCalendarQueryParams(request.nextUrl.searchParams);
    const icsContent = generateHebrewCalendarIcs(hebOptions, request.nextUrl.origin);
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const result = await DataStore.getMembershipByToken(token);
  if (!result) {
    return new NextResponse('Calendar feed not found or invalid token', { status: 404 });
  }

  const { membership, calendar } = result;
  const allBranches = await DataStore.getBranches(calendar.id);
  const allBranchIds = allBranches.map(b => b.id);
  const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

  // Get records matching user's selected branches, sub-branches (Gen 2/3/4), maxGen, and skipGens
  const allDeceased = await DataStore.getDeceased(calendar.id);
  const queryBranches = request.nextUrl.searchParams.get('branches');
  const querySubBranch = request.nextUrl.searchParams.get('subBranch');
  const queryMaxGen = request.nextUrl.searchParams.get('maxGen');
  const querySkipGens = request.nextUrl.searchParams.get('skipGens');
  const queryUserGen = request.nextUrl.searchParams.get('userGen');
  const queryCalName = request.nextUrl.searchParams.get('calName');
  const queryType = request.nextUrl.searchParams.get('type'); // 'memorials' | 'simchas' | 'all'
  const queryBirthdays = request.nextUrl.searchParams.get('birthdays');
  const queryZShkia = request.nextUrl.searchParams.get('zShkia');
  const queryZTzeit = request.nextUrl.searchParams.get('zTzeit');
  const queryZEve = request.nextUrl.searchParams.get('zEve');

  const rawSelected = Array.isArray(membership.selected_branch_ids) ? membership.selected_branch_ids : [];
  if (rawSelected.includes('status:pending')) {
    return new NextResponse('הבקשה להצטרף לענף ממתינה לאישור בעל היומן', { status: 403 });
  }

  // Optional user preferences for adding Shkia and/or Tzeit HaKochavim of the start of the Yahrzeit
  const includeStartShkia =
    queryZShkia !== null ? queryZShkia === '1' || queryZShkia === 'true' : rawSelected.includes('zShkia:1');
  const includeStartTzeit =
    queryZTzeit !== null ? queryZTzeit === '1' || queryZTzeit === 'true' : rawSelected.includes('zTzeit:1');
  const includeEveReminder =
    queryZEve !== null ? queryZEve === '1' || queryZEve === 'true' : rawSelected.includes('zEveReminder:1');

  // Determine feed type so Memorials (יארצייט) and Simchas (ימי הולדת וימי נישואין) can be subscribed as 2 separate colored calendars
  const feedType: 'memorials' | 'simchas' | 'all' =
    queryType === 'simchas' || queryBirthdays === 'only'
      ? 'simchas'
      : queryType === 'all' || queryBirthdays === 'true'
      ? 'all'
      : 'memorials';

  // Extract any stored maxGen:N, skipGens:..., calName:..., or gen2:/gen3:/gen4: tokens from membership.selected_branch_ids
  const storedMaxGenToken = rawSelected.find(s => s.startsWith('maxGen:'));
  const storedSkipGensToken = rawSelected.find(s => s.startsWith('skipGens:'));
  const storedCalNameToken = rawSelected.find(s => s.startsWith('calName:'));
  const storedSubBranches = rawSelected.filter(s => s.startsWith('gen2:') || s.startsWith('gen3:') || s.startsWith('gen4:'));
  const storedUuidBranches = rawSelected.filter(id => allBranchIds.includes(id));

  let targetBranchIds: string[];
  if (queryBranches) {
    targetBranchIds = queryBranches.split(',').map(s => s.trim()).filter(Boolean);
  } else if (storedUuidBranches.length > 0) {
    targetBranchIds = storedUuidBranches;
  } else {
    targetBranchIds = allBranchIds;
  }

  const activeSubBranches: string[] = querySubBranch && querySubBranch !== 'all'
    ? querySubBranch.split(',').map(s => s.trim()).filter(Boolean)
    : storedSubBranches;

  const effectiveMaxGenStr = queryMaxGen || (storedMaxGenToken ? storedMaxGenToken.replace('maxGen:', '') : null);
  const effectiveMaxGen = effectiveMaxGenStr && effectiveMaxGenStr !== 'all' ? Number(effectiveMaxGenStr) : null;

  const effectiveSkipGensStr = querySkipGens !== null
    ? querySkipGens
    : storedSkipGensToken
    ? storedSkipGensToken.replace('skipGens:', '')
    : rawSelected
        .filter(s => s.startsWith('skipGen:'))
        .map(s => s.replace('skipGen:', ''))
        .join(',');
  const skippedGenSet = new Set<number>(
    effectiveSkipGensStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => !isNaN(n))
  );

  const userGen =
    queryUserGen !== null && !isNaN(Number(queryUserGen))
      ? Number(queryUserGen)
      : membership.user_generation ?? 1;

  const passesEventFilter = (d: typeof allDeceased[number]) => {
    if (!d.hebrew_day || !d.hebrew_month) return false;
    const living = isPersonLiving(d);
    if (feedType === 'memorials' && living) return false;
    if (feedType === 'simchas' && !living) return false;

    const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
    if (effectiveMaxGen && !isNaN(effectiveMaxGen) && effectiveMaxGen > 0) {
      if (relGen > effectiveMaxGen) return false;
    }
    if (skippedGenSet.has(relGen)) return false;

    return true;
  };

  const filteredDeceased = allDeceased.filter(d => {
    if (!passesEventFilter(d)) return false;
    if (!targetBranchIds.includes(d.branch_id)) return false;

    if (activeSubBranches.length > 0) {
      const matchesAnySub = activeSubBranches.some(sb => matchesBranchHierarchyFilter(d, sb, allBranches));
      if (!matchesAnySub) return false;
    }

    return true;
  });

  // Also include any approved linked branches from other calendars into this user's unified calendar feed!
  if (membership.user_email && !queryBranches) {
    const { linkedBranches, linkedDeceased } = await DataStore.getLinkedDeceasedAndBranchesForCalendar(
      calendar.id,
      membership.user_email
    );
    for (const lb of linkedBranches) {
      branchMap.set(lb.id, lb.name);
    }
    for (const ld of linkedDeceased) {
      if (
        passesEventFilter(ld) &&
        !filteredDeceased.some(existing => existing.id === ld.id)
      ) {
        filteredDeceased.push(ld);
      }
    }
  }

  const customCalName = queryCalName || (storedCalNameToken ? storedCalNameToken.replace(/^calName:/, '') : '');
  const displayCalName = (
    feedType === 'simchas'
      ? formatSimchaCalendarDisplayName(calendar.name, customCalName)
      : formatCalendarDisplayName(calendar.name, customCalName)
  ).normalize('NFKC');
  const displayCalDesc = formatCalendarDescription(calendar, membership.user_name).normalize('NFKC');

  // Initialize iCalendar (omit timezone so DTSTAMP is strictly UTC with 'Z' per RFC 5545, and set X-WR-TIMEZONE)
  const cal = ical({
    name: displayCalName,
    description: displayCalDesc,
    method: ICalCalendarMethod.PUBLISH,
    ttl: 900, // Re-fetch every 15 minutes
    x: [
      ['X-WR-TIMEZONE', 'Asia/Jerusalem'],
      ['X-APPLE-CALENDAR-COLOR', feedType === 'simchas' ? '#10b981' : '#1e3a8a'],
      ['COLOR', feedType === 'simchas' ? '#10b981' : '#1e3a8a'],
    ],
  });

  // Dynamic sequence so Google Calendar automatically updates modified dates or names in-place
  const dynamicSequence = Math.max(100, Math.floor((Date.now() - 1790000000000) / 10000));
  const nowStamp = new Date();
  const todayUtcStr = nowStamp.toISOString().slice(0, 10);

  interface PendingIcsEvent {
    id: string;
    gregorianDateStr: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    summary: string;
    description: string;
    isUpcomingFromToday: boolean;
  }

  const pendingEvents: PendingIcsEvent[] = [];

  // Calculate yahrzeits & Hebrew simchas for the current Hebrew year + next 2 years
  for (const dec of filteredDeceased) {
    const living = isPersonLiving(dec);
    const simchaType = getSimchaType(dec);
    const branchName = (branchMap.get(dec.branch_id) || 'כללי').normalize('NFKC');
    const upcomingList = calculateUpcomingYahrzeits(dec, 3, true);

    const rawFullDisplayName = getDeceasedFullName(dec).normalize('NFKC');
    const fullDisplayName = rawFullDisplayName
      .replace(/\s*—\s*/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Keep summary concise if the name contains a long biographical comma suffix from Geni
    let conciseName = fullDisplayName;
    if (conciseName.length > 55 && conciseName.includes(',')) {
      const honorificMatch = conciseName.match(/(זצוק״ל|זצ״ל|זי״ע|הי״ד|ע״ה|ז״ל)$/);
      const firstPart = conciseName.split(',')[0].trim();
      conciseName = honorificMatch && !firstPart.endsWith(honorificMatch[1])
        ? `${firstPart} ${honorificMatch[1]}`
        : firstPart;
    }

    const leiluyText = formatLeiluyNishmat(dec).normalize('NFKC');
    const originalDateFormatted = formatDisplayDateWithGregorian(
      dec.hebrew_day,
      dec.hebrew_month,
      dec.hebrew_year,
      dec.gregorian_original_date
    ).normalize('NFKC');

    const genInfo = getGenerationRelationInfo(dec, userGen);
    const relationLine = `קרבה: ${genInfo.badgeText} (${genInfo.relationDescription})`.normalize('NFKC');

    // Keep lineage chain concise inside the ICS file so large 25-gen trees stay fast and well under Google's size limits
    const rawPath = Array.isArray(dec.lineage_path) ? dec.lineage_path : [];
    const lineageChain = (
      rawPath.length > 5
        ? `${rawPath.slice(0, 2).map((s: any) => s.name || s).join(' -> ')} -> ... (${rawPath.length} דורות) ... -> ${rawPath.slice(-2).map((s: any) => s.name || s).join(' -> ')}`
        : formatLineageChainText(dec.lineage_path).replace(/➔/g, '->')
    ).normalize('NFKC');
    const lineageUrl = `${request.nextUrl.origin}/?lineage=${dec.id}`;

    const rawNotes = cleanLivingMarkerFromText(dec.notes);
    const cleanNotes = rawNotes
      ? rawNotes
          .normalize('NFKC')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180)
      : '';

    const simchaLabel =
      simchaType === 'anniversary'
        ? '💍 יום נישואין עברי'
        : simchaType === 'simcha'
        ? '🥂 שמחה משפחתית'
        : '🎂 יום הולדת עברי';

    for (const upcoming of upcomingList) {
      const [y, m, d] = upcoming.gregorianDateStr.split('-').map(Number);
      if (!y || !m || !d) continue;

      // Place the event ONLY on the date of that day itself (single-day all-day event),
      // so it never stretches across two days starting from the day before!
      const startDate = new Date(Date.UTC(y, m - 1, d));
      const endDate = new Date(Date.UTC(y, m - 1, d + 1));
      const allDay = true;
      let zmanimLine = '';
      let timesTitleSuffix = '';
      let zmanimInfo: ReturnType<typeof getHalachicYahrzeitTimes> | null = null;

      if (!living) {
        zmanimInfo = getHalachicYahrzeitTimes(upcoming.gregorianDateStr);
        zmanimLine = `🕯️ זמני היארצייט: מתחיל בערב הקודם בשקיעה (${zmanimInfo.startShkiaFormatted}) / צאת הכוכבים (${zmanimInfo.startTzeitFormatted}) ומסתיים בשקיעה (${zmanimInfo.endShkiaFormatted})`;

        const chosenTimesParts: string[] = [];
        if (includeStartShkia) {
          chosenTimesParts.push(`שקיעה ${zmanimInfo.startShkiaFormatted}`);
        }
        if (includeStartTzeit) {
          chosenTimesParts.push(`צאה״כ ${zmanimInfo.startTzeitFormatted}`);
        }
        if (chosenTimesParts.length > 0) {
          timesTitleSuffix = ` • מתחיל בערב (${chosenTimesParts.join(' | ')})`;
        }
      }

      const yearsPassedText =
        upcoming.yearsPassed > 0
          ? living
            ? simchaType === 'anniversary'
              ? ` (${upcoming.yearsPassed} שנות נישואין)`
              : simchaType === 'simcha'
              ? ` (שנת ה-${upcoming.yearsPassed})`
              : ` (גיל ${upcoming.yearsPassed})`
            : ` (שנת ה-${upcoming.yearsPassed})`
          : '';

      const eventDescription = living
        ? [
            `${simchaLabel} של ${fullDisplayName}`,
            leiluyText ? `ייחוס משפחתי: ${leiluyText}` : '',
            relationLine,
            `תאריך עברי: ${originalDateFormatted}`,
            `ענף משפחתי: ${branchName}`,
            lineageChain ? `שרשרת היוחסין: ${lineageChain}` : '',
            cleanNotes ? `הערות: ${cleanNotes}` : '',
            `צפייה באילן: ${lineageUrl}`,
          ]
            .filter(Boolean)
            .join('\n')
        : [
            `יום השנה לפטירת ${fullDisplayName}`,
            zmanimLine,
            leiluyText ? `לעילוי נשמת: ${leiluyText}` : '',
            relationLine,
            `תאריך עברי: ${originalDateFormatted}`,
            `ענף משפחתי: ${branchName}`,
            lineageChain ? `שרשרת היוחסין: ${lineageChain}` : '',
            cleanNotes ? `הערות: ${cleanNotes}` : '',
            dec.after_sunset ? 'הערה הלכתית: הפטירה לאחר שקיעה/צאת הכוכבים.' : '',
            `צפייה באילן: ${lineageUrl}`,
          ]
            .filter(Boolean)
            .join('\n');

      pendingEvents.push({
        id: `${living ? simchaType : 'yahrzeit'}-${dec.id}-${upcoming.hebrewYear}@yahrzeit-hub`,
        gregorianDateStr: upcoming.gregorianDateStr,
        startDate,
        endDate,
        allDay,
        isUpcomingFromToday: upcoming.gregorianDateStr >= todayUtcStr,
        summary: living
          ? `${simchaLabel}: ${conciseName}${yearsPassedText}`
          : `🕯️ יארצייט: ${conciseName}${yearsPassedText}${timesTitleSuffix}`,
        description: eventDescription,
      });

      // Optional point reminder on the evening before (when the user explicitly checks "תזכורת בערב שלפני")
      if (!living && includeEveReminder && zmanimInfo) {
        const eveStart = includeStartShkia ? zmanimInfo.startShkia : zmanimInfo.startTzeit;
        const eveEnd = new Date(eveStart.getTime() + 15 * 60 * 1000);
        const eveParts: string[] = [];
        if (includeStartShkia) eveParts.push(`שקיעה ${zmanimInfo.startShkiaFormatted}`);
        if (includeStartTzeit) eveParts.push(`צאה״כ ${zmanimInfo.startTzeitFormatted}`);
        if (eveParts.length === 0) {
          eveParts.push(`שקיעה ${zmanimInfo.startShkiaFormatted} | צאה״כ ${zmanimInfo.startTzeitFormatted}`);
        }
        pendingEvents.push({
          id: `yahrzeit-eve-${dec.id}-${upcoming.hebrewYear}@yahrzeit-hub`,
          gregorianDateStr: upcoming.gregorianDateStr,
          startDate: eveStart,
          endDate: eveEnd,
          allDay: false,
          isUpcomingFromToday: upcoming.gregorianDateStr >= todayUtcStr,
          summary: `🕯️ הדלקת נר (ליל יארצייט): ${conciseName} (${eveParts.join(' | ')})`,
          description: eventDescription,
        });
      }
    }
  }

  // Sort events so upcoming events starting from today appear at the very top of the ICS file
  pendingEvents.sort((a, b) => {
    if (a.isUpcomingFromToday !== b.isUpcomingFromToday) {
      return a.isUpcomingFromToday ? -1 : 1;
    }
    return a.gregorianDateStr.localeCompare(b.gregorianDateStr);
  });

  for (const ev of pendingEvents) {
    cal.createEvent({
      id: ev.id,
      start: ev.startDate,
      end: ev.endDate,
      allDay: ev.allDay,
      sequence: dynamicSequence,
      stamp: nowStamp,
      lastModified: nowStamp,
      summary: ev.summary,
      description: ev.description,
    });
  }

  const calendarString = cal.toString();

  return new NextResponse(calendarString, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
