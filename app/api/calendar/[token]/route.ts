import { NextRequest, NextResponse } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { DataStore } from '@/lib/data-store';
import {
  calculateUpcomingYahrzeits,
  formatDisplayDateWithGregorian,
  formatHebrewDateString,
  getDeceasedFullName,
  formatLineageChainText,
  getGenerationRelationInfo,
  formatLeiluyNishmat,
  matchesBranchHierarchyFilter,
  formatCalendarDisplayName,
  formatCalendarDescription,
} from '@/lib/hebrew-calendar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, '');

  const result = await DataStore.getMembershipByToken(token);
  if (!result) {
    return new NextResponse('Calendar feed not found or invalid token', { status: 404 });
  }

  const { membership, calendar } = result;
  const allBranches = await DataStore.getBranches(calendar.id);
  const allBranchIds = allBranches.map(b => b.id);
  const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

  // Get deceased records matching user's selected branches, sub-branches (Gen 2/3/4), and maxGenerations
  const allDeceased = await DataStore.getDeceased(calendar.id);
  const queryBranches = request.nextUrl.searchParams.get('branches');
  const querySubBranch = request.nextUrl.searchParams.get('subBranch');
  const queryMaxGen = request.nextUrl.searchParams.get('maxGen');
  const queryCalName = request.nextUrl.searchParams.get('calName');

  const rawSelected = Array.isArray(membership.selected_branch_ids) ? membership.selected_branch_ids : [];
  if (rawSelected.includes('status:pending')) {
    return new NextResponse('הבקשה להצטרף לענף ממתינה לאישור בעל היומן', { status: 403 });
  }

  // Extract any stored maxGen:N, calName:..., or gen2:/gen3:/gen4: tokens from membership.selected_branch_ids
  const storedMaxGenToken = rawSelected.find(s => s.startsWith('maxGen:'));
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
  const userGen = membership.user_generation ?? 1;

  const filteredDeceased = allDeceased.filter(d => {
    if (!d.hebrew_day || !d.hebrew_month) return false;
    if (!targetBranchIds.includes(d.branch_id)) return false;

    if (activeSubBranches.length > 0) {
      const matchesAnySub = activeSubBranches.some(sb => matchesBranchHierarchyFilter(d, sb, allBranches));
      if (!matchesAnySub) return false;
    }

    if (effectiveMaxGen && !isNaN(effectiveMaxGen) && effectiveMaxGen > 0) {
      const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
      if (relGen > effectiveMaxGen) return false;
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
      if (ld.hebrew_day && ld.hebrew_month && !filteredDeceased.some(existing => existing.id === ld.id)) {
        filteredDeceased.push(ld);
      }
    }
  }

  const customCalName = queryCalName || (storedCalNameToken ? storedCalNameToken.replace(/^calName:/, '') : '');
  const displayCalName = formatCalendarDisplayName(calendar.name, customCalName).normalize('NFKC');
  const displayCalDesc = formatCalendarDescription(calendar, membership.user_name).normalize('NFKC');

  // Initialize iCalendar (omit timezone so DTSTAMP is strictly UTC with 'Z' per RFC 5545, and set X-WR-TIMEZONE)
  const cal = ical({
    name: displayCalName,
    description: displayCalDesc,
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600, // Re-fetch every 1 hour
    x: [['X-WR-TIMEZONE', 'Asia/Jerusalem']],
  });

  // Dynamic sequence so Google Calendar automatically updates modified dates or names
  const dynamicSequence = Math.max(1, Math.floor((Date.now() - 1790000000000) / 60000));
  const nowStamp = new Date();
  const todayUtcStr = nowStamp.toISOString().slice(0, 10);

  interface PendingIcsEvent {
    id: string;
    gregorianDateStr: string;
    startDate: Date;
    endDate: Date;
    summary: string;
    description: string;
    isUpcomingFromToday: boolean;
  }

  const pendingEvents: PendingIcsEvent[] = [];

  // Calculate yahrzeits for the current Hebrew year + next 2 years (includePassedThisYear = true so the full current year is present)
  for (const dec of filteredDeceased) {
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

    const genInfo = getGenerationRelationInfo(dec, membership.user_generation ?? 1);
    const relationLine = `קרבה: ${genInfo.badgeText} (${genInfo.relationDescription})`.normalize('NFKC');

    // Keep lineage chain concise inside the ICS file so large 25-gen trees stay fast and well under Google's size limits
    const rawPath = Array.isArray(dec.lineage_path) ? dec.lineage_path : [];
    const lineageChain = (
      rawPath.length > 5
        ? `${rawPath.slice(0, 2).map((s: any) => s.name || s).join(' -> ')} -> ... (${rawPath.length} דורות) ... -> ${rawPath.slice(-2).map((s: any) => s.name || s).join(' -> ')}`
        : formatLineageChainText(dec.lineage_path).replace(/➔/g, '->')
    ).normalize('NFKC');
    const lineageUrl = `${request.nextUrl.origin}/?lineage=${dec.id}`;

    const cleanNotes = dec.notes
      ? dec.notes
          .normalize('NFKC')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180)
      : '';

    for (const upcoming of upcomingList) {
      const [y, m, d] = upcoming.gregorianDateStr.split('-').map(Number);
      if (!y || !m || !d) continue;

      // Strictly UTC midnight so ical-generator formats the exact YYYYMMDD regardless of server timezone
      const startDate = new Date(Date.UTC(y, m - 1, d));
      const endDate = new Date(Date.UTC(y, m - 1, d + 1));

      const yearsPassedText = upcoming.yearsPassed > 0 ? ` (שנת ה-${upcoming.yearsPassed})` : '';

      pendingEvents.push({
        id: `yahrzeit-${dec.id}-${upcoming.hebrewYear}@yahrzeit-hub`,
        gregorianDateStr: upcoming.gregorianDateStr,
        startDate,
        endDate,
        isUpcomingFromToday: upcoming.gregorianDateStr >= todayUtcStr,
        summary: `יארצייט: ${conciseName}${yearsPassedText}`,
        description: [
          `יום השנה לפטירת ${fullDisplayName}`,
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
          .join('\n'),
      });
    }
  }

  // Sort events so upcoming events starting from today (this month Tishrei & next month Cheshvan first!) appear at the very top of the ICS file
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
      allDay: true,
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
