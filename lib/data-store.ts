import { supabase } from './supabase';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from './types';

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
      name: 'יומן משפחת רייכקינד המורחבת',
      description: 'לוח ימי פטירה (יארצייט) המשפחתי לכל ענפי המשפחה',
      created_by_user_id: 'shalomyosefzeev@gmail.com',
      created_by_user_name: 'ספי רייכקינד',
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
        supabase.from('calendar_members').select('calendar_id').eq('user_email', userEmail),
      ]);

      const calendarIds = new Set<string>();
      const list: CalendarProject[] = [];

      (ownedRes.data || []).forEach((c: any) => {
        calendarIds.add(c.id);
        list.push(c as CalendarProject);
      });

      const memberCalIds = (memberRes.data || [])
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
      return cache.memberships.some(m => m.calendar_id === c.id && m.user_email === userEmail);
    });
    return allowed;
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
    try {
      const { data } = await supabase.from('deceased').insert(deceased).select().single();
      if (data) return data as DeceasedPerson;
    } catch (err) {
      console.error('Supabase addDeceased error:', err);
    }
    const cache = getCache();
    cache.deceased.push(deceased);
    return deceased;
  },

  async updateDeceased(id: string, updates: Partial<DeceasedPerson>) {
    try {
      const { data } = await supabase.from('deceased').update(updates).eq('id', id).select().single();
      if (data) return data as DeceasedPerson;
    } catch (err) {
      console.error('Supabase updateDeceased error:', err);
    }
    const cache = getCache();
    const idx = cache.deceased.findIndex(d => d.id === id);
    if (idx !== -1) {
      cache.deceased[idx] = { ...cache.deceased[idx], ...updates };
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

  async getMembershipByToken(feedToken: string): Promise<{ membership: UserMembership; calendar: CalendarProject } | null> {
    try {
      const { data: member } = await supabase
        .from('calendar_members')
        .select('*')
        .eq('feed_token', feedToken)
        .single();

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
};
