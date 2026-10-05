import { supabase } from './supabase';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership, LinkedBranchSource } from './types';
import { extractBranchHierarchy, matchesBranchHierarchyFilter, getGenerationRelationInfo } from './hebrew-calendar';
import crypto from 'crypto';

// Fallback in-memory/file cache for development/offline
let memoryCache: {
  calendars: CalendarProject[];
  branches: FamilyBranch[];
  deceased: DeceasedPerson[];
  memberships: UserMembership[];
} | null = null;

const INITIAL_DATA = {
  calendars: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'יומן משפחת ישראלי המורחבת',
      description: 'לוח ימי פטירה (יארצייט) המשפחתי לכל ענפי המשפחה',
      created_by_user_id: 'owner@example.com',
      created_by_user_name: 'בעל היומן',
      created_at: new Date().toISOString(),
    },
  ],
  branches: [
    {
      id: '22222222-2222-2222-2222-222222222221',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      name: 'ענף סבא ישראל מאיר (צד אבא)',
      color: '#2563eb',
      created_at: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      name: 'ענף סבתא שרה רבקה (צד אמא)',
      color: '#059669',
      created_at: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222223',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      name: 'ענף משפחת כהן (מחותנים)',
      color: '#d97706',
      created_at: new Date().toISOString(),
    },
  ],
  deceased: [
    {
      id: '33333333-3333-3333-3333-333333333331',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      branch_id: '22222222-2222-2222-2222-222222222221',
      first_name: 'ישראל מאיר',
      last_name: 'ישראלי',
      father_or_mother_name: 'בן אברהם',
      hebrew_day: 17,
      hebrew_month: 'Adar',
      hebrew_year: 5742,
      gregorian_original_date: '1982-03-12',
      after_sunset: true,
      leap_year_preference: 'Adar II' as const,
      notes: 'קבור בהר המנוחות גוש ב׳, לומר משניות אותיות נשמה',
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333332',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      branch_id: '22222222-2222-2222-2222-222222222222',
      first_name: 'שרה רבקה',
      last_name: 'לוי',
      father_or_mother_name: 'בת חיים',
      hebrew_day: 24,
      hebrew_month: 'Tevet',
      hebrew_year: 5755,
      gregorian_original_date: '1994-12-27',
      after_sunset: false,
      leap_year_preference: 'Adar II' as const,
      notes: 'צדקה לעילוי נשמתה ביום הפטירה',
      created_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      branch_id: '22222222-2222-2222-2222-222222222223',
      first_name: 'יוסף שלום',
      last_name: 'כהן',
      father_or_mother_name: 'בן יצחק',
      hebrew_day: 9,
      hebrew_month: 'Av',
      hebrew_year: 5763,
      gregorian_original_date: '2003-08-07',
      after_sunset: false,
      leap_year_preference: 'Adar II' as const,
      notes: 'קבור בסגולה בפתח תקווה',
      created_at: new Date().toISOString(),
    },
  ],
  memberships: [
    {
      id: '44444444-4444-4444-4444-444444444441',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      user_email: 'sefi@example.com',
      user_name: 'ספי ישראלי',
      role: 'admin' as const,
      feed_token: 'feed-all-branches-demo',
      selected_branch_ids: [
        '22222222-2222-2222-2222-222222222221',
        '22222222-2222-2222-2222-222222222222',
        '22222222-2222-2222-2222-222222222223',
      ],
    },
    {
      id: '44444444-4444-4444-4444-444444444442',
      calendar_id: '11111111-1111-1111-1111-111111111111',
      user_email: 'dan@example.com',
      user_name: 'דן (צד אבא בלבד)',
      role: 'member' as const,
      feed_token: 'feed-branch-1-demo',
      selected_branch_ids: ['22222222-2222-2222-2222-222222222221'],
    },
  ],
};

function getCache() {
  if (!memoryCache) {
    memoryCache = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  return memoryCache!;
}

export const DataStore = {
  async getAll(): Promise<{
    calendars: CalendarProject[];
    branches: FamilyBranch[];
    deceased: DeceasedPerson[];
    memberships: UserMembership[];
  }> {
    try {
      const [cRes, bRes, dRes, mRes] = await Promise.all([
        supabase.from('calendars').select('*').order('created_at', { ascending: true }),
        supabase.from('branches').select('*').order('created_at', { ascending: true }),
        supabase.from('deceased').select('*').order('created_at', { ascending: true }),
        supabase.from('calendar_members').select('*'),
      ]);

      if (cRes.data && cRes.data.length > 0) {
        return {
          calendars: cRes.data as CalendarProject[],
          branches: (bRes.data || []) as FamilyBranch[],
          deceased: (dRes.data || []) as DeceasedPerson[],
          memberships: (mRes.data || []) as UserMembership[],
        };
      }
    } catch (err) {
      console.warn('Supabase query error, using local fallback:', err);
    }

    return getCache();
  },

  async getCalendar(calendarId: string): Promise<CalendarProject | undefined> {
    try {
      const { data } = await supabase.from('calendars').select('*').eq('id', calendarId).single();
      if (data) return data as CalendarProject;
    } catch {
      // fallback
    }
    return getCache().calendars.find(c => c.id === calendarId);
  },

  async getUserCalendars(userEmail: string): Promise<CalendarProject[]> {
    try {
      const [ownedRes, memberRes] = await Promise.all([
        supabase.from('calendars').select('*').eq('created_by_user_id', userEmail),
        supabase.from('calendar_members').select('calendar_id, selected_branch_ids').eq('user_email', userEmail),
      ]);

      const calendarIds = new Set<string>();
      const list: CalendarProject[] = [];

      (ownedRes.data || []).forEach((c: any) => {
        calendarIds.add(c.id);
        list.push(c as CalendarProject);
      });

      const memberCalIds = (memberRes.data || [])
        .filter((m: any) => {
          const tags: string[] = Array.isArray(m.selected_branch_ids) ? m.selected_branch_ids : [];
          // Exclude pending join requests from appearing as unlocked calendars
          return !tags.includes('status:pending');
        })
        .map((m: any) => m.calendar_id)
        .filter((id: string) => !calendarIds.has(id));

      if (memberCalIds.length > 0) {
        const { data: moreCals } = await supabase.from('calendars').select('*').in('id', memberCalIds);
        (moreCals || []).forEach((c: any) => list.push(c as CalendarProject));
      }

      return list;
    } catch {
      // fallback
    }

    const cache = getCache();
    const allowed = cache.calendars.filter(c => {
      if (c.created_by_user_id === userEmail) return true;
      return cache.memberships.some(
        m =>
          m.calendar_id === c.id &&
          m.user_email === userEmail &&
          !(m.selected_branch_ids || []).includes('status:pending')
      );
    });
    return allowed;
  },

  async getPublicCalendarsDirectory(): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      created_by_user_name: string;
      created_by_user_id: string;
      branches: Array<{ id: string; name: string; color: string }>;
      subBranches: {
        mainBranches: Array<{ id: string; label: string; count: number }>;
        grandparentBranches: Array<{ id: string; label: string; count: number }>;
        greatGrandparentBranches: Array<{ id: string; label: string; count: number }>;
      };
    }>
  > {
    const all = await this.getAll();
    return all.calendars.map(cal => {
      const calBranches = all.branches
        .filter(b => b.calendar_id === cal.id)
        .map(b => ({ id: b.id, name: b.name, color: b.color }));
      const calDeceased = all.deceased.filter(d => d.calendar_id === cal.id);
      const hierarchy = extractBranchHierarchy(calDeceased, calBranches);

      return {
        id: cal.id,
        name: cal.name,
        description: cal.description,
        created_by_user_name: cal.created_by_user_name,
        created_by_user_id: cal.created_by_user_id,
        branches: calBranches,
        subBranches: {
          mainBranches: hierarchy.mainBranches.map(x => ({ id: x.id, label: x.label, count: x.count })),
          grandparentBranches: hierarchy.grandparentBranches.map(x => ({ id: x.id, label: x.label, count: x.count })),
          greatGrandparentBranches: hierarchy.greatGrandparentBranches.map(x => ({
            id: x.id,
            label: x.label,
            count: x.count,
          })),
        },
      };
    });
  },

  async getLinkedDeceasedAndBranchesForCalendar(
    targetCalendarId: string,
    userEmail: string
  ): Promise<{
    linkedBranches: FamilyBranch[];
    linkedDeceased: DeceasedPerson[];
    linkedSources: LinkedBranchSource[];
  }> {
    if (!userEmail) {
      return { linkedBranches: [], linkedDeceased: [], linkedSources: [] };
    }

    let userMemberships: UserMembership[] = [];
    try {
      const { data } = await supabase
        .from('calendar_members')
        .select('*')
        .eq('user_email', userEmail);
      if (data) userMemberships = data as UserMembership[];
    } catch {
      userMemberships = getCache().memberships.filter(m => m.user_email === userEmail);
    }

    const otherMemberships = userMemberships.filter(m => m.calendar_id !== targetCalendarId);
    if (otherMemberships.length === 0) {
      return { linkedBranches: [], linkedDeceased: [], linkedSources: [] };
    }

    const linkedBranches: FamilyBranch[] = [];
    const linkedDeceased: DeceasedPerson[] = [];
    const linkedSources: LinkedBranchSource[] = [];

    for (const m of otherMemberships) {
      const rawSelected = Array.isArray(m.selected_branch_ids) ? m.selected_branch_ids : [];
      const linkedToken = rawSelected.find(s => s.startsWith('linkedToCal:'));
      const isPending = rawSelected.includes('status:pending');

      // Include if linked specifically to targetCalendarId, or linkedToCal:all, or if it's a pending request made by this user
      const targetCalFromToken = linkedToken ? linkedToken.replace('linkedToCal:', '') : '';
      const isLinkedToThisCal =
        targetCalFromToken === targetCalendarId || targetCalFromToken === 'all' || isPending;

      if (!isLinkedToThisCal) continue;

      const sourceCal = await this.getCalendar(m.calendar_id);
      if (!sourceCal) continue;

      linkedSources.push({
        membership_id: m.id,
        source_calendar_id: sourceCal.id,
        source_calendar_name: sourceCal.name,
        source_owner_name: sourceCal.created_by_user_name,
        status: isPending ? 'pending' : 'approved',
        role: m.role,
        selected_branch_ids: rawSelected,
        target_calendar_id: targetCalFromToken || targetCalendarId,
      });

      // Only merge actual branches & deceased into the calendar if the request is approved!
      if (isPending) continue;

      const sourceBranches = await this.getBranches(sourceCal.id);
      const sourceDeceased = await this.getDeceased(sourceCal.id);
      const allSourceBranchIds = sourceBranches.map(b => b.id);

      const storedUuidBranches = rawSelected.filter(id => allSourceBranchIds.includes(id));
      const targetBranchIds = storedUuidBranches.length > 0 ? storedUuidBranches : allSourceBranchIds;
      const activeSubBranches = rawSelected.filter(
        s => s.startsWith('gen2:') || s.startsWith('gen3:') || s.startsWith('gen4:')
      );
      const storedMaxGenToken = rawSelected.find(s => s.startsWith('maxGen:'));
      const effectiveMaxGenStr = storedMaxGenToken ? storedMaxGenToken.replace('maxGen:', '') : null;
      const effectiveMaxGen =
        effectiveMaxGenStr && effectiveMaxGenStr !== 'all' ? Number(effectiveMaxGenStr) : null;
      const userGen = m.user_generation ?? 1;

      const matchedBranches = sourceBranches
        .filter(b => targetBranchIds.includes(b.id))
        .map(b => ({
          ...b,
          name: `${b.name} (משותף מיומן ${sourceCal.name})`,
          is_linked: true,
          source_calendar_id: sourceCal.id,
          source_calendar_name: sourceCal.name,
        }));

      const matchedDeceased = sourceDeceased.filter(d => {
        if (!targetBranchIds.includes(d.branch_id)) return false;
        if (activeSubBranches.length > 0) {
          const matchesSub = activeSubBranches.some(sb =>
            matchesBranchHierarchyFilter(d, sb, sourceBranches)
          );
          if (!matchesSub) return false;
        }
        if (effectiveMaxGen && !isNaN(effectiveMaxGen) && effectiveMaxGen > 0) {
          const relGen = getGenerationRelationInfo(d, userGen).relativeGeneration;
          if (relGen > effectiveMaxGen) return false;
        }
        return true;
      });

      linkedBranches.push(...matchedBranches);
      linkedDeceased.push(...matchedDeceased);
    }

    return { linkedBranches, linkedDeceased, linkedSources };
  },

  async getUserMembership(calendarId: string, userEmail: string): Promise<UserMembership | null> {
    try {
      const { data } = await supabase
        .from('calendar_members')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('user_email', userEmail)
        .maybeSingle();

      if (data) return data as UserMembership;
    } catch {
      // fallback
    }

    const cache = getCache();
    return cache.memberships.find(m => m.calendar_id === calendarId && m.user_email === userEmail) || null;
  },

  async addCalendar(calendar: CalendarProject) {
    try {
      const { data } = await supabase.from('calendars').insert(calendar).select().single();
      if (data) return data as CalendarProject;
    } catch (err) {
      console.error('Supabase addCalendar error:', err);
    }
    const cache = getCache();
    cache.calendars.push(calendar);
    return calendar;
  },

  async updateCalendar(calendarId: string, updates: Partial<CalendarProject>): Promise<CalendarProject | null> {
    try {
      const { data } = await supabase
        .from('calendars')
        .update(updates)
        .eq('id', calendarId)
        .select()
        .single();
      if (data) return data as CalendarProject;
    } catch (err) {
      console.error('Supabase updateCalendar error:', err);
    }
    const cache = getCache();
    const idx = cache.calendars.findIndex(c => c.id === calendarId);
    if (idx !== -1) {
      cache.calendars[idx] = { ...cache.calendars[idx], ...updates };
      return cache.calendars[idx];
    }
    return null;
  },

  async deleteCalendar(calendarId: string) {
    try {
      // 1. Delete all deceased in calendar
      await supabase.from('deceased').delete().eq('calendar_id', calendarId);
      // 2. Delete all branches in calendar
      await supabase.from('branches').delete().eq('calendar_id', calendarId);
      // 3. Delete all memberships in calendar
      await supabase.from('calendar_members').delete().eq('calendar_id', calendarId);
      // 4. Delete the calendar itself
      await supabase.from('calendars').delete().eq('id', calendarId);
    } catch (err) {
      console.error('Supabase deleteCalendar error:', err);
    }

    const cache = getCache();
    cache.calendars = cache.calendars.filter(c => c.id !== calendarId);
    cache.branches = cache.branches.filter(b => b.calendar_id !== calendarId);
    cache.deceased = cache.deceased.filter(d => d.calendar_id !== calendarId);
    cache.memberships = cache.memberships.filter(m => m.calendar_id !== calendarId);
  },

  async getBranches(calendarId: string): Promise<FamilyBranch[]> {
    try {
      const { data } = await supabase.from('branches').select('*').eq('calendar_id', calendarId);
      if (data && data.length > 0) return data as FamilyBranch[];
    } catch {
      // fallback
    }
    return getCache().branches.filter(b => b.calendar_id === calendarId);
  },

  async addBranch(branch: FamilyBranch) {
    try {
      const { data } = await supabase.from('branches').insert(branch).select().single();
      if (data) return data as FamilyBranch;
    } catch (err) {
      console.error('Supabase addBranch error:', err);
    }
    const cache = getCache();
    cache.branches.push(branch);
    return branch;
  },

  async deleteBranch(branchId: string) {
    try {
      await supabase.from('branches').delete().eq('id', branchId);
    } catch (err) {
      console.error('Supabase deleteBranch error:', err);
    }
    const cache = getCache();
    cache.branches = cache.branches.filter(b => b.id !== branchId);
    cache.deceased = cache.deceased.filter(d => d.branch_id !== branchId);
  },

  async getDeceased(calendarId: string): Promise<DeceasedPerson[]> {
    try {
      const { data } = await supabase.from('deceased').select('*').eq('calendar_id', calendarId);
      if (data && data.length > 0) return data as DeceasedPerson[];
    } catch {
      // fallback
    }
    return getCache().deceased.filter(d => d.calendar_id === calendarId);
  },

  async addDeceased(deceased: DeceasedPerson) {
    const dbRecord: any = { ...deceased };
    if (typeof dbRecord.is_living === 'boolean') {
      const cleanRel = (dbRecord.relationship || '').replace(/\[בחיים\]/g, '').trim();
      if (dbRecord.is_living) {
        dbRecord.relationship = cleanRel ? `[בחיים] ${cleanRel}` : '[בחיים] בן/בת משפחה';
      } else {
        dbRecord.relationship = cleanRel || undefined;
        if (dbRecord.notes) {
          dbRecord.notes = dbRecord.notes.replace(/\[בחיים\]/g, '').trim();
        }
      }
      delete dbRecord.is_living;
    }
    try {
      const { data } = await supabase.from('deceased').insert(dbRecord).select().single();
      if (data) return data as DeceasedPerson;
    } catch (err) {
      console.error('Supabase addDeceased error:', err);
    }
    const cache = getCache();
    cache.deceased.push({ ...deceased, ...dbRecord });
    return { ...deceased, ...dbRecord };
  },

  async updateDeceased(id: string, updates: Partial<DeceasedPerson>) {
    const dbUpdates: any = { ...updates };
    if (typeof dbUpdates.is_living === 'boolean') {
      const cleanRel = (dbUpdates.relationship || '').replace(/\[בחיים\]/g, '').trim();
      if (dbUpdates.is_living) {
        dbUpdates.relationship = cleanRel ? `[בחיים] ${cleanRel}` : '[בחיים] בן/בת משפחה';
      } else {
        dbUpdates.relationship = cleanRel || null;
        if (typeof dbUpdates.notes === 'string') {
          dbUpdates.notes = dbUpdates.notes.replace(/\[בחיים\]/g, '').trim();
        }
      }
      delete dbUpdates.is_living;
    }
    try {
      const { data } = await supabase.from('deceased').update(dbUpdates).eq('id', id).select().single();
      if (data) return data as DeceasedPerson;
    } catch (err) {
      console.error('Supabase updateDeceased error:', err);
    }
    const cache = getCache();
    const idx = cache.deceased.findIndex(d => d.id === id);
    if (idx !== -1) {
      cache.deceased[idx] = { ...cache.deceased[idx], ...dbUpdates };
      return cache.deceased[idx];
    }
    return null;
  },

  async deleteDeceased(id: string) {
    try {
      await supabase.from('deceased').delete().eq('id', id);
    } catch (err) {
      console.error('Supabase deleteDeceased error:', err);
    }
    const cache = getCache();
    cache.deceased = cache.deceased.filter(d => d.id !== id);
  },

  async getMembershipByToken(rawFeedToken: string): Promise<{ membership: UserMembership; calendar: CalendarProject } | null> {
    const feedToken = (rawFeedToken || '').replace(/\.ics$/i, '');
    try {
      const { data: member } = await supabase
        .from('calendar_members')
        .select('*')
        .eq('feed_token', feedToken)
        .maybeSingle();

      if (member) {
        const { data: cal } = await supabase
          .from('calendars')
          .select('*')
          .eq('id', member.calendar_id)
          .single();

        if (cal) {
          return { membership: member as UserMembership, calendar: cal as CalendarProject };
        }
      }

      // Fallback: if feedToken is a calendar_id, 'shared', or 'demo-token-default', resolve calendar directly
      const isGenericToken = feedToken === 'shared' || feedToken === 'demo-token-default';
      const calQuery = isGenericToken
        ? supabase.from('calendars').select('*').limit(1).maybeSingle()
        : supabase.from('calendars').select('*').eq('id', feedToken).maybeSingle();
      const { data: fallbackCal } = await calQuery;
      if (fallbackCal) {
        const branches = await this.getBranches(fallbackCal.id);
        return {
          calendar: fallbackCal as CalendarProject,
          membership: {
            id: 'shared-feed',
            calendar_id: fallbackCal.id,
            user_email: fallbackCal.created_by_user_id,
            user_name: fallbackCal.created_by_user_name || 'יומן משותף',
            role: 'member',
            feed_token: feedToken,
            selected_branch_ids: branches.map(b => b.id),
          },
        };
      }
    } catch {
      // fallback
    }

    const cache = getCache();
    const membership = cache.memberships.find(m => m.feed_token === feedToken);
    if (!membership) return null;
    const calendar = cache.calendars.find(c => c.id === membership.calendar_id);
    if (!calendar) return null;
    return { membership, calendar };
  },

  async getCalendarMembers(calendarId: string): Promise<UserMembership[]> {
    try {
      const { data } = await supabase
        .from('calendar_members')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: true });
      if (data) return data as UserMembership[];
    } catch (err) {
      console.error('Supabase getCalendarMembers error:', err);
    }
    return getCache().memberships.filter(m => m.calendar_id === calendarId);
  },

  async removeMembership(calendarId: string, userEmail: string) {
    try {
      await supabase
        .from('calendar_members')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('user_email', userEmail);
    } catch (err) {
      console.error('Supabase removeMembership error:', err);
    }
    const cache = getCache();
    cache.memberships = cache.memberships.filter(
      m => !(m.calendar_id === calendarId && m.user_email === userEmail)
    );
  },

  async saveMembership(membership: UserMembership) {
    try {
      const { data } = await supabase
        .from('calendar_members')
        .upsert(membership, { onConflict: 'calendar_id,user_email' })
        .select()
        .single();
      if (data) return data as UserMembership;
    } catch (err) {
      console.error('Supabase saveMembership error:', err);
    }

    const cache = getCache();
    const idx = cache.memberships.findIndex(
      m => m.calendar_id === membership.calendar_id && m.user_email === membership.user_email
    );
    if (idx !== -1) {
      cache.memberships[idx] = membership;
    } else {
      cache.memberships.push(membership);
    }
    return membership;
  },

  async bulkImport(
    calendarId: string,
    rawBranches: Array<{ name: string; color?: string }>,
    rawDeceased: Array<{
      first_name: string;
      last_name: string;
      father_or_mother_name?: string;
      branch_name?: string;
      hebrew_day: number;
      hebrew_month: string;
      hebrew_year?: number;
      gregorian_original_date?: string;
      after_sunset?: boolean;
      leap_year_preference?: 'Adar I' | 'Adar II';
      notes?: string;
    }>
  ): Promise<{ addedBranches: number; addedDeceased: number }> {
    const existingBranches = await this.getBranches(calendarId);
    const branchMap = new Map<string, string>();
    for (const b of existingBranches) {
      branchMap.set(b.name.trim().toLowerCase(), b.id);
    }

    let addedBranchesCount = 0;
    const colors = ['#2563eb', '#10b981', '#d97706', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

    // Ensure all branches from import exist
    for (const rb of rawBranches || []) {
      if (!rb.name) continue;
      const cleanName = rb.name.trim();
      const key = cleanName.toLowerCase();
      if (!branchMap.has(key)) {
        const color = rb.color || colors[(existingBranches.length + addedBranchesCount) % colors.length];
        const newBranch: FamilyBranch = {
          id: crypto.randomUUID(),
          calendar_id: calendarId,
          name: cleanName,
          color,
          created_at: new Date().toISOString(),
        };
        await this.addBranch(newBranch);
        branchMap.set(key, newBranch.id);
        addedBranchesCount++;
      }
    }

    const currentBranches = await this.getBranches(calendarId);
    const defaultBranchId = currentBranches[0]?.id || crypto.randomUUID();

    let addedDeceasedCount = 0;
    for (const rd of rawDeceased || []) {
      if (!rd.first_name || !rd.last_name || !rd.hebrew_day || !rd.hebrew_month) continue;
      const branchKey = (rd.branch_name || '').trim().toLowerCase();
      const branchId = branchMap.get(branchKey) || defaultBranchId;

      const newDeceased: DeceasedPerson = {
        id: crypto.randomUUID(),
        calendar_id: calendarId,
        branch_id: branchId,
        first_name: rd.first_name.trim(),
        last_name: rd.last_name.trim(),
        father_or_mother_name: rd.father_or_mother_name?.trim() || '',
        hebrew_day: Number(rd.hebrew_day),
        hebrew_month: rd.hebrew_month,
        hebrew_year: Number(rd.hebrew_year) || 5700,
        gregorian_original_date: rd.gregorian_original_date || '',
        after_sunset: Boolean(rd.after_sunset),
        leap_year_preference: (rd.leap_year_preference as any) || 'Adar II',
        notes: rd.notes || '',
        created_at: new Date().toISOString(),
      };

      await this.addDeceased(newDeceased);
      addedDeceasedCount++;
    }

    return { addedBranches: addedBranchesCount, addedDeceased: addedDeceasedCount };
  },
};
