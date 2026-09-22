import { NextRequest, NextResponse } from 'next/server';
import { DataStore } from '@/lib/data-store';
import { checkDuplicateOrDiscrepancy } from '@/lib/hebrew-calendar';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const calendarId = searchParams.get('calendarId');

  const allData = await DataStore.getAll();
  if (calendarId) {
    const calendar = await DataStore.getCalendar(calendarId);
    const branches = await DataStore.getBranches(calendarId);
    const deceased = await DataStore.getDeceased(calendarId);
    return NextResponse.json({ calendar, branches, deceased, calendars: allData.calendars });
  }

  return NextResponse.json(allData);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'add_deceased': {
        const { deceased, forceConfirm } = payload;
        const currentDeceasedList = await DataStore.getDeceased(deceased.calendar_id);

        // Check for duplicate or date discrepancy unless user explicitly confirmed
        if (!forceConfirm) {
          const conflict = checkDuplicateOrDiscrepancy(currentDeceasedList, deceased);
          if (conflict) {
            return NextResponse.json({
              conflict: true,
              conflictType: conflict.type,
              message: conflict.message,
              matchedRecord: conflict.matchedRecord,
            }, { status: 409 });
          }
        }

        const newDeceased = {
          ...deceased,
          id: deceased.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
        };
        const saved = await DataStore.addDeceased(newDeceased);
        return NextResponse.json({ success: true, deceased: saved });
      }

      case 'update_deceased': {
        const { id, updates, forceConfirm } = payload;
        const currentDeceasedList = await DataStore.getDeceased(updates.calendar_id);

        if (!forceConfirm) {
          const conflict = checkDuplicateOrDiscrepancy(currentDeceasedList, updates, id);
          if (conflict) {
            return NextResponse.json({
              conflict: true,
              conflictType: conflict.type,
              message: conflict.message,
              matchedRecord: conflict.matchedRecord,
            }, { status: 409 });
          }
        }

        const updated = await DataStore.updateDeceased(id, updates);
        return NextResponse.json({ success: true, deceased: updated });
      }

      case 'delete_deceased': {
        const { id } = payload;
        await DataStore.deleteDeceased(id);
        return NextResponse.json({ success: true });
      }

      case 'add_branch': {
        const { calendar_id, name, color } = payload;
        const newBranch = {
          id: crypto.randomUUID(),
          calendar_id,
          name,
          color: color || '#2563eb',
          created_at: new Date().toISOString(),
        };
        const saved = await DataStore.addBranch(newBranch);
        return NextResponse.json({ success: true, branch: saved });
      }

      case 'delete_branch': {
        const { id } = payload;
        await DataStore.deleteBranch(id);
        return NextResponse.json({ success: true });
      }

      case 'create_calendar': {
        const { name, description, user_name, user_email } = payload;
        const calendarId = crypto.randomUUID();
        const newCalendar = {
          id: calendarId,
          name,
          description: description || '',
          created_by_user_id: user_email,
          created_by_user_name: user_name,
          created_at: new Date().toISOString(),
        };
        await DataStore.addCalendar(newCalendar);

        // Add a default main branch
        const defaultBranch = {
          id: crypto.randomUUID(),
          calendar_id: calendarId,
          name: 'ענף ראשי',
          color: '#2563eb',
          created_at: new Date().toISOString(),
        };
        await DataStore.addBranch(defaultBranch);

        // Add creator as Admin with their personal feed token
        const feedToken = crypto.randomUUID();
        const membership = {
          id: crypto.randomUUID(),
          calendar_id: calendarId,
          user_email,
          user_name,
          role: 'admin' as const,
          feed_token: feedToken,
          selected_branch_ids: [defaultBranch.id],
        };
        await DataStore.saveMembership(membership);

        return NextResponse.json({
          success: true,
          calendar: newCalendar,
          branch: defaultBranch,
          membership,
        });
      }

      case 'save_membership': {
        const { membership } = payload;
        if (!membership.feed_token) {
          membership.feed_token = crypto.randomUUID();
        }
        const saved = await DataStore.saveMembership(membership);
        return NextResponse.json({ success: true, membership: saved });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
