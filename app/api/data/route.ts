import { NextRequest, NextResponse } from 'next/server';
import { DataStore } from '@/lib/data-store';
import {
  checkDuplicateOrDiscrepancy,
  matchesBranchHierarchyFilter,
  getGenerationRelationInfo,
  extractUserTreePosition,
} from '@/lib/hebrew-calendar';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const calendarId = searchParams.get('calendarId');
  const userEmail = searchParams.get('userEmail');
  const userName = searchParams.get('userName') || 'אורח';

  if (searchParams.get('directory') === 'true') {
    const directory = await DataStore.getPublicCalendarsDirectory();
    return NextResponse.json({ directory });
  }

  const isShare = searchParams.get('isShare') === 'true' || searchParams.get('shared') === 'true';

  // If this is a shared calendar view link (e.g. sent via WhatsApp / Web link)
  if (isShare && calendarId) {
    const calendar = await DataStore.getCalendar(calendarId);
    if (!calendar) {
      return NextResponse.json({ error: 'היומן המבוקש לא נמצא' }, { status: 404 });
    }

    const allBranches = await DataStore.getBranches(calendarId);
    const branchesParam = searchParams.get('branches');
    const branchIds = branchesParam
      ? branchesParam.split(',').map(s => s.trim()).filter(Boolean)
      : allBranches.map(b => b.id);

    const filteredBranches = allBranches.filter(b => branchIds.includes(b.id));
    const allDeceased = await DataStore.getDeceased(calendarId);
    const filteredDeceased = allDeceased.filter(d => branchIds.includes(d.branch_id));

    const invitedRole = searchParams.get('role') === 'editor' ? 'editor' : 'member';

    // If a logged-in user visits the shared link, automatically register/upgrade their membership
    let userMembership = null;
    if (userEmail && userEmail !== 'guest@example.com') {
      const existing = await DataStore.getUserMembership(calendarId, userEmail);
      const isOwner = calendar.created_by_user_id.toLowerCase() === userEmail.toLowerCase();
      const effectiveRole = isOwner
        ? 'admin'
        : existing?.role === 'admin' || existing?.role === 'editor'
        ? existing.role
        : invitedRole;

      // Remove status:pending if they opened an explicit share link from the owner
      const existingTags = (existing?.selected_branch_ids || []).filter(t => t !== 'status:pending');

      userMembership = {
        id: existing?.id || crypto.randomUUID(),
        calendar_id: calendarId,
        user_email: userEmail,
        user_name: existing?.user_name || userName,
        role: effectiveRole as 'admin' | 'editor' | 'member',
        feed_token: existing?.feed_token || crypto.randomUUID(),
        selected_branch_ids: existingTags.length ? existingTags : branchIds,
        user_generation: existing?.user_generation ?? 1,
      };
      await DataStore.saveMembership(userMembership);
    }

    // Get owner membership for sync feed token
    const ownerMembership = await DataStore.getUserMembership(calendarId, calendar.created_by_user_id);

    return NextResponse.json({
      calendar,
      branches: filteredBranches,
      deceased: filteredDeceased,
      isSharedView: true,
      shareRole: invitedRole,
      membership: userMembership,
      selectedBranchIds: branchIds,
      feedToken: userMembership?.feed_token || ownerMembership?.feed_token || calendar.id,
    });
  }

  // If unauthenticated guest, return empty calendars list
  if (!userEmail || userEmail === 'guest@example.com') {
    return NextResponse.json({ calendars: [] });
  }

  // 1. Fetch only calendars accessible to this specific user
  const rawCalendars = await DataStore.getUserCalendars(userEmail);
  const userCalendars = await Promise.all(
    rawCalendars.map(async (cal) => {
      try {
        const [d, b, m] = await Promise.all([
          DataStore.getDeceased(cal.id),
          DataStore.getBranches(cal.id),
          DataStore.getCalendarMembers(cal.id),
        ]);
        const pendingCount = m.filter((x) =>
          (x.selected_branch_ids || []).includes('status:pending')
        ).length;
        const approvedCount = m.filter(
          (x) => !(x.selected_branch_ids || []).includes('status:pending')
        ).length;
        return {
          ...cal,
          deceased_count: d.length,
          branches_count: b.length,
          members_count: approvedCount,
          pending_requests_count: pendingCount,
        };
      } catch {
        return cal;
      }
    })
  );

  if (calendarId) {
    // Verify user has access to this calendar
    const hasAccess = userCalendars.some(c => c.id === calendarId);
    if (!hasAccess && userCalendars.length > 0) {
      return NextResponse.json({ error: 'אין לך הרשאה לצפות ביומן זה' }, { status: 403 });
    }

    const calendar = await DataStore.getCalendar(calendarId);
    if (!calendar) {
      return NextResponse.json({ error: 'היומן לא נמצא' }, { status: 404 });
    }

    const ownBranches = await DataStore.getBranches(calendarId);
    const ownDeceased = await DataStore.getDeceased(calendarId);

    // Fetch or create membership ONLY for this requesting user
    let membership = await DataStore.getUserMembership(calendarId, userEmail);
    const isOwner = calendar.created_by_user_id.toLowerCase() === userEmail.toLowerCase();
    if (!membership) {
      membership = {
        id: crypto.randomUUID(),
        calendar_id: calendarId,
        user_email: userEmail,
        user_name: userName,
        role: isOwner ? 'admin' : 'member',
        feed_token: crypto.randomUUID(),
        selected_branch_ids: ownBranches.map(b => b.id),
      };
      membership = await DataStore.saveMembership(membership);
    }

    const isAdminMember = isOwner || membership.role === 'admin';
    const rawSelected = Array.isArray(membership.selected_branch_ids) ? membership.selected_branch_ids : [];
    const allOwnBranchIds = ownBranches.map(b => b.id);
    const allowedUuidBranches = rawSelected.filter(id => allOwnBranchIds.includes(id));
    const effectiveBranchIds =
      !isAdminMember && allowedUuidBranches.length > 0 ? allowedUuidBranches : allOwnBranchIds;
    const activeSubBranches = !isAdminMember
      ? rawSelected.filter(s => s.startsWith('gen2:') || s.startsWith('gen3:') || s.startsWith('gen4:'))
      : [];
    const storedMaxGenToken = !isAdminMember ? rawSelected.find(s => s.startsWith('maxGen:')) : null;
    const effectiveMaxGenStr = storedMaxGenToken ? storedMaxGenToken.replace('maxGen:', '') : null;
    const effectiveMaxGen =
      effectiveMaxGenStr && effectiveMaxGenStr !== 'all' ? Number(effectiveMaxGenStr) : null;
    const userGen = membership.user_generation ?? 1;

    const visibleOwnBranches = isAdminMember
      ? ownBranches
      : ownBranches.filter(b => effectiveBranchIds.includes(b.id));

    const visibleOwnDeceased = isAdminMember
      ? ownDeceased
      : ownDeceased.filter(d => {
          if (!effectiveBranchIds.includes(d.branch_id)) return false;
          if (activeSubBranches.length > 0) {
            const matchesSub = activeSubBranches.some(sb =>
              matchesBranchHierarchyFilter(d, sb, ownBranches)
            );
            if (!matchesSub) return false;
          }
          if (effectiveMaxGen && !isNaN(effectiveMaxGen) && effectiveMaxGen > 0) {
            const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
            if (relGen > effectiveMaxGen) return false;
          }
          return true;
        });

    // Also include any approved linked branches from other calendars into this user's unified calendar!
    const { linkedBranches, linkedDeceased, linkedSources } =
      await DataStore.getLinkedDeceasedAndBranchesForCalendar(calendarId, userEmail);

    const combinedBranches = [...visibleOwnBranches, ...linkedBranches];
    const combinedDeceased = [...visibleOwnDeceased];
    for (const ld of linkedDeceased) {
      if (!combinedDeceased.some(existing => existing.id === ld.id)) {
        combinedDeceased.push(ld);
      }
    }

    const members = isAdminMember
      ? await DataStore.getCalendarMembers(calendarId)
      : [];

    return NextResponse.json({
      calendar,
      branches: combinedBranches,
      deceased: combinedDeceased,
      linkedSources,
      membership,
      members,
      calendars: userCalendars,
    });
  }

  // If no calendarId requested, return only the user's calendars list
  return NextResponse.json({ calendars: userCalendars });
}

async function canUserEditCalendar(calendarId: string, userEmail: string): Promise<boolean> {
  if (!calendarId || !userEmail) return false;
  const cal = await DataStore.getCalendar(calendarId);
  if (!cal) return false;
  if (cal.created_by_user_id.toLowerCase() === userEmail.toLowerCase()) return true;
  const m = await DataStore.getUserMembership(calendarId, userEmail);
  if (!m || (m.selected_branch_ids || []).includes('status:pending')) return false;
  return m.role === 'admin' || m.role === 'editor';
}

async function isCalendarAdmin(calendarId: string, userEmail: string): Promise<boolean> {
  if (!calendarId || !userEmail) return false;
  const cal = await DataStore.getCalendar(calendarId);
  if (!cal) return false;
  if (cal.created_by_user_id.toLowerCase() === userEmail.toLowerCase()) return true;
  const m = await DataStore.getUserMembership(calendarId, userEmail);
  if (!m || (m.selected_branch_ids || []).includes('status:pending')) return false;
  return m.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload, userEmail = 'sefi@example.com' } = body;

    switch (action) {
      case 'add_deceased': {
        const { deceased, forceConfirm } = payload;
        const canEdit = await canUserEditCalendar(deceased.calendar_id, userEmail);
        if (!canEdit) {
          return NextResponse.json({ error: 'אין לך הרשאת עריכה ביומן זה (הרשאת צפייה בלבד)' }, { status: 403 });
        }

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
        const canEdit = await canUserEditCalendar(updates.calendar_id, userEmail);
        if (!canEdit) {
          return NextResponse.json({ error: 'אין לך הרשאת עריכה ביומן זה (הרשאת צפייה בלבד)' }, { status: 403 });
        }

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
        const { id, calendar_id } = payload;
        if (calendar_id) {
          const canEdit = await canUserEditCalendar(calendar_id, userEmail);
          if (!canEdit) {
            return NextResponse.json({ error: 'אין לך הרשאת מחיקה ביומן זה' }, { status: 403 });
          }
        }
        await DataStore.deleteDeceased(id);
        return NextResponse.json({ success: true });
      }

      case 'add_branch': {
        const { calendar_id, name, color } = payload;
        const canEdit = await canUserEditCalendar(calendar_id, userEmail);
        if (!canEdit) {
          return NextResponse.json({ error: 'אין לך הרשאת עריכה ביומן זה' }, { status: 403 });
        }
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
        const { id, calendar_id } = payload;
        if (calendar_id) {
          const canEdit = await canUserEditCalendar(calendar_id, userEmail);
          if (!canEdit) {
            return NextResponse.json({ error: 'אין לך הרשאת עריכה ביומן זה' }, { status: 403 });
          }
        }
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

        // Add default main branch
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

      case 'update_calendar': {
        const { calendarId, name, description } = payload;
        const isAdmin = await isCalendarAdmin(calendarId, userEmail);
        if (!isAdmin) {
          return NextResponse.json({ error: 'רק מנהל היומן יכול לערוך את שם ותיאור היומן' }, { status: 403 });
        }
        const updated = await DataStore.updateCalendar(calendarId, {
          name: (name || '').trim(),
          description: (description ?? '').trim(),
        });
        return NextResponse.json({ success: true, calendar: updated });
      }

      case 'delete_calendar': {
        const { calendarId } = payload;
        const isAdmin = await isCalendarAdmin(calendarId, userEmail);
        if (!isAdmin) {
          return NextResponse.json({ error: 'אין לך הרשאה למחוק יומן זה' }, { status: 403 });
        }
        await DataStore.deleteCalendar(calendarId);
        return NextResponse.json({ success: true });
      }

      case 'save_membership': {
        const { membership } = payload;
        if (!membership.feed_token) {
          membership.feed_token = crypto.randomUUID();
        }
        const saved = await DataStore.saveMembership(membership);
        return NextResponse.json({ success: true, membership: saved });
      }

      case 'manage_member': {
        const calendarId = payload.calendarId || payload.calendar_id;
        const targetEmail = payload.targetEmail || payload.member_email;
        const targetName = payload.targetName || payload.member_name;
        const role = payload.role;
        const selectedBranchIds = payload.selectedBranchIds || payload.selected_branch_ids;

        const isAdmin = await isCalendarAdmin(calendarId, userEmail);
        if (!isAdmin) {
          return NextResponse.json({ error: 'רק מנהל היומן יכול לעדכן הרשאות משתמשים' }, { status: 403 });
        }

        const cleanEmail = (targetEmail || '').trim().toLowerCase();
        if (!cleanEmail) {
          return NextResponse.json({ error: 'נא להזין כתובת אימייל תקינה' }, { status: 400 });
        }

        const existing = await DataStore.getUserMembership(calendarId, cleanEmail);
        const allBranches = await DataStore.getBranches(calendarId);
        const existingTags = existing?.selected_branch_ids || [];

        // Preserve any linkedToCal:..., calName:..., skipGen:..., and tree position tokens if not explicitly provided
        const existingLinkedToken = existingTags.find(s => s.startsWith('linkedToCal:'));
        const existingCalNameToken = existingTags.find(s => s.startsWith('calName:'));
        const existingSkipTokens = existingTags.filter(s => s.startsWith('skipGen:'));
        const existingTreeTokens = existingTags.filter(
          s =>
            s.startsWith('userGen:') ||
            s.startsWith('treeRelation:') ||
            s.startsWith('treeAnchorId:') ||
            s.startsWith('treeAnchorName:')
        );

        const baseBranches: string[] = (
          selectedBranchIds ||
          existingTags ||
          allBranches.map(b => b.id)
        ).filter(
          (s: string) =>
            s !== 'status:pending' &&
            !s.startsWith('reqRole:') &&
            !s.startsWith('reqNote:')
        );

        if (existingLinkedToken && !baseBranches.some(s => s.startsWith('linkedToCal:'))) {
          baseBranches.push(existingLinkedToken);
        }
        if (existingCalNameToken && !baseBranches.some(s => s.startsWith('calName:'))) {
          baseBranches.push(existingCalNameToken);
        }
        if (existingSkipTokens.length > 0 && !baseBranches.some(s => s.startsWith('skipGen:'))) {
          baseBranches.push(...existingSkipTokens);
        }
        const hasIncomingTreeTokens = baseBranches.some(
          s =>
            s.startsWith('userGen:') ||
            s.startsWith('treeRelation:') ||
            s.startsWith('treeAnchorId:') ||
            s.startsWith('treeAnchorName:')
        );
        if (!hasIncomingTreeTokens && existingTreeTokens.length > 0) {
          baseBranches.push(...existingTreeTokens);
        }

        const extractedPos = extractUserTreePosition(
          baseBranches,
          existing?.user_generation ?? 1
        );

        const memberRecord = {
          id: existing?.id || crypto.randomUUID(),
          calendar_id: calendarId,
          user_email: cleanEmail,
          user_name: (targetName || existing?.user_name || cleanEmail.split('@')[0]).trim(),
          role: (role || 'member') as 'admin' | 'editor' | 'member',
          feed_token: existing?.feed_token || crypto.randomUUID(),
          selected_branch_ids: baseBranches,
          user_generation: extractedPos.userGeneration,
          tree_relation: extractedPos.relationType,
          tree_person_id: extractedPos.anchorPersonId,
          tree_person_name: extractedPos.anchorPersonName,
        };

        const savedMember = await DataStore.saveMembership(memberRecord);
        const members = await DataStore.getCalendarMembers(calendarId);
        return NextResponse.json({ success: true, member: savedMember, members });
      }

      case 'remove_member': {
        const calendarId = payload.calendarId || payload.calendar_id;
        const targetEmail = payload.targetEmail || payload.member_email;
        const isAdmin = await isCalendarAdmin(calendarId, userEmail);
        // Also allow the user themselves to cancel/unlink their own request or linked branch
        const isSelf = (targetEmail || '').toLowerCase() === (userEmail || '').toLowerCase();
        if (!isAdmin && !isSelf) {
          return NextResponse.json({ error: 'רק מנהל היומן יכול להסיר משתמשים' }, { status: 403 });
        }
        await DataStore.removeMembership(calendarId, targetEmail);
        const members = await DataStore.getCalendarMembers(calendarId);
        return NextResponse.json({ success: true, members });
      }

      case 'request_branch_join': {
        const {
          sourceCalendarId,
          targetCalendarId,
          requestedBranchIds = [],
          requestedRole = 'member',
          userName,
          note = '',
          autoApproveIfAlreadyMember = false,
          userGeneration,
          treeRelation,
          treePersonId,
          treePersonName,
        } = payload;

        const cleanEmail = (userEmail || '').trim().toLowerCase();
        if (!cleanEmail || cleanEmail === 'guest@example.com') {
          return NextResponse.json({ error: 'יש להתחבר לחשבון כדי לבקש הצטרפות לענף' }, { status: 401 });
        }

        const sourceCal = await DataStore.getCalendar(sourceCalendarId);
        if (!sourceCal) {
          return NextResponse.json({ error: 'היומן המבוקש לא נמצא' }, { status: 404 });
        }

        const existing = await DataStore.getUserMembership(sourceCalendarId, cleanEmail);
        const isOwner = sourceCal.created_by_user_id.toLowerCase() === cleanEmail;
        const wasAlreadyApproved =
          isOwner ||
          (existing && !(existing.selected_branch_ids || []).includes('status:pending'));

        const shouldAutoApprove = isOwner || (wasAlreadyApproved && autoApproveIfAlreadyMember);

        const allSourceBranches = await DataStore.getBranches(sourceCalendarId);
        const branchTokens: string[] =
          Array.isArray(requestedBranchIds) && requestedBranchIds.length > 0
            ? requestedBranchIds.filter(
                (t: string) =>
                  !t.startsWith('status:') &&
                  !t.startsWith('linkedToCal:') &&
                  !t.startsWith('reqRole:') &&
                  !t.startsWith('reqNote:')
              )
            : allSourceBranches.map(b => b.id);

        if (targetCalendarId) {
          branchTokens.push(`linkedToCal:${targetCalendarId}`);
        } else {
          branchTokens.push('linkedToCal:all');
        }

        if (!shouldAutoApprove) {
          branchTokens.push('status:pending');
          branchTokens.push(`reqRole:${requestedRole === 'editor' ? 'editor' : 'member'}`);
          if (note && note.trim()) {
            branchTokens.push(`reqNote:${note.trim().slice(0, 120)}`);
          }
        } else {
          branchTokens.push('status:approved');
        }

        const extractedPos = extractUserTreePosition(
          branchTokens,
          typeof userGeneration === 'number'
            ? userGeneration
            : existing?.user_generation ?? 1
        );

        const memberRecord = {
          id: existing?.id || crypto.randomUUID(),
          calendar_id: sourceCalendarId,
          user_email: cleanEmail,
          user_name: (userName || existing?.user_name || cleanEmail.split('@')[0]).trim(),
          role: (shouldAutoApprove
            ? existing?.role || 'member'
            : requestedRole === 'editor'
            ? 'editor'
            : 'member') as 'admin' | 'editor' | 'member',
          feed_token: existing?.feed_token || crypto.randomUUID(),
          selected_branch_ids: branchTokens,
          user_generation: extractedPos.userGeneration,
          tree_relation: treeRelation || extractedPos.relationType,
          tree_person_id: treePersonId !== undefined ? treePersonId : extractedPos.anchorPersonId,
          tree_person_name:
            treePersonName !== undefined ? treePersonName : extractedPos.anchorPersonName,
        };

        const savedMember = await DataStore.saveMembership(memberRecord);
        return NextResponse.json({
          success: true,
          membership: savedMember,
          status: shouldAutoApprove ? 'approved' : 'pending',
        });
      }

      case 'bulk_import': {
        const { calendarId, branches, deceased } = payload;
        const canEdit = await canUserEditCalendar(calendarId, userEmail);
        if (!canEdit) {
          return NextResponse.json({ error: 'אין לך הרשאה לייבא נתונים ליומן זה' }, { status: 403 });
        }

        const result = await DataStore.bulkImport(calendarId, branches || [], deceased || []);
        const updatedBranches = await DataStore.getBranches(calendarId);
        const updatedDeceased = await DataStore.getDeceased(calendarId);

        return NextResponse.json({
          success: true,
          addedBranches: result.addedBranches,
          addedDeceased: result.addedDeceased,
          branches: updatedBranches,
          deceased: updatedDeceased,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
