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
} from '@/lib/hebrew-calendar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

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

  const rawSelected = Array.isArray(membership.selected_branch_ids) ? membership.selected_branch_ids : [];

  // Extract any stored maxGen:N or gen2:/gen3:/gen4: tokens from membership.selected_branch_ids
  const storedMaxGenToken = rawSelected.find(s => s.startsWith('maxGen:'));
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

  // Initialize iCalendar
  const cal = ical({
    name: `${calendar.name} - ${membership.user_name}`,
    description: `לוח ימי פטירה (יארצייט) מתעדכן אוטומטית עבור ${membership.user_name}`,
    timezone: 'Asia/Jerusalem',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600, // Re-fetch every 1 hour
  });

  // Dynamic sequence so Google Calendar automatically updates modified dates or names
  const dynamicSequence = Math.floor(Date.now() / 60000);
  const nowStamp = new Date();

  // Calculate upcoming yahrzeits for the next 10 years for each deceased person
  for (const dec of filteredDeceased) {
    const branchName = branchMap.get(dec.branch_id) || 'כללי';
    const upcomingList = calculateUpcomingYahrzeits(dec, 10);

    const fullDisplayName = getDeceasedFullName(dec);
    const leiluyText = formatLeiluyNishmat(dec);
    const originalDateFormatted = formatDisplayDateWithGregorian(
      dec.hebrew_day,
      dec.hebrew_month,
      dec.hebrew_year,
      dec.gregorian_original_date
    );

    const genInfo = getGenerationRelationInfo(dec, membership.user_generation ?? 1);
    const relationLine = `קרבה לבעל היומן: ${genInfo.fullDescription}`;

    const lineageChain = formatLineageChainText(dec.lineage_path);
    const lineageUrl = `${request.nextUrl.origin}/?lineage=${dec.id}`;

    for (const upcoming of upcomingList) {
      // Event dates: All-day event on upcoming.gregorianDate
      const startDate = new Date(upcoming.gregorianDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const yearsPassedText = upcoming.yearsPassed > 0 ? ` (שנת ה-${upcoming.yearsPassed} לפטירה)` : '';

      cal.createEvent({
        id: `yahrzeit-${dec.id}-${upcoming.hebrewYear}@yahrzeit-hub`,
        start: startDate,
        end: endDate,
        allDay: true,
        sequence: dynamicSequence,
        stamp: nowStamp,
        lastModified: nowStamp,
        summary: `יארצייט: ${fullDisplayName}${yearsPassedText}`,
        description: [
          `יום השנה לפטירת ${fullDisplayName}`,
          leiluyText ? `לעילוי נשמת: ${leiluyText}` : '',
          relationLine,
          lineageChain ? `\n🔗 שרשרת היוחסין:\n${lineageChain}` : '',
          `\n🔗 צפייה בשרשרת הייחוס המלאה באילן:\n${lineageUrl}`,
          `\nתאריך עברי מקורי: ${originalDateFormatted}`,
          `ענף משפחתי: ${branchName}`,
          dec.notes ? `הערות ומנהגים: ${dec.notes}` : '',
          dec.after_sunset ? 'הערה הלכתית: הפטירה אירעה לאחר צאת הכוכבים / השקיעה.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        location: dec.notes?.includes('קבור') || dec.notes?.includes('מנוחת') ? dec.notes : undefined,
        url: lineageUrl,
      });
    }
  }

  const calendarString = cal.toString();

  return new NextResponse(calendarString, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="yahrzeit-calendar.ics"`,
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    },
  });
}
