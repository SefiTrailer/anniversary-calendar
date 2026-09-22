import { NextRequest, NextResponse } from 'next/server';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { DataStore } from '@/lib/data-store';
import { calculateUpcomingYahrzeits, formatDisplayDateWithGregorian, formatHebrewDateString } from '@/lib/hebrew-calendar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = DataStore.getMembershipByToken(token);
  if (!result) {
    return new NextResponse('Calendar feed not found or invalid token', { status: 404 });
  }

  const { membership, calendar } = result;
  const allBranches = DataStore.getBranches(calendar.id);
  const branchMap = new Map(allBranches.map(b => [b.id, b.name]));

  // Get deceased records matching user's selected branches
  const allDeceased = DataStore.getDeceased(calendar.id);
  const filteredDeceased = allDeceased.filter(d =>
    membership.selected_branch_ids.includes(d.branch_id)
  );

  // Initialize iCalendar
  const cal = ical({
    name: `${calendar.name} - ${membership.user_name}`,
    description: `לוח ימי פטירה (יארצייט) עבור ${membership.user_name}`,
    timezone: 'Asia/Jerusalem',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 3600, // Re-fetch every 1 hour
  });

  // Calculate upcoming yahrzeits for the next 10 years for each deceased person
  for (const dec of filteredDeceased) {
    const branchName = branchMap.get(dec.branch_id) || 'כללי';
    const upcomingList = calculateUpcomingYahrzeits(dec, 10);

    const displayName = `${dec.first_name} ${dec.last_name}`.trim();
    const parentName = dec.father_or_mother_name ? ` (${dec.father_or_mother_name})` : '';
    const originalDateFormatted = formatDisplayDateWithGregorian(
      dec.hebrew_day,
      dec.hebrew_month,
      dec.hebrew_year,
      dec.gregorian_original_date
    );

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
        sequence: 1,
        stamp: new Date(),
        summary: `יארצייט: ${displayName} ז"ל${yearsPassedText}`,
        description: [
          `יום השנה לפטירת ${displayName}${parentName} ז"ל`,
          `תאריך עברי מקורי: ${originalDateFormatted}`,
          `ענף משפחתי: ${branchName}`,
          dec.notes ? `הערות ומנהגים: ${dec.notes}` : '',
          dec.after_sunset ? 'הערה הלכתית: הפטירה אירעה לאחר צאת הכוכבים / השקיעה.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        location: dec.notes?.includes('קבור') ? dec.notes : undefined,
        url: request.nextUrl.origin,
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
