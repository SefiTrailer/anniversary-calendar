import fs from 'fs';
import path from 'path';
import { CalendarProject, FamilyBranch, DeceasedPerson, UserMembership } from './types';

interface StoreData {
  calendars: CalendarProject[];
  branches: FamilyBranch[];
  deceased: DeceasedPerson[];
  memberships: UserMembership[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'calendar_data.json');

const INITIAL_DATA: StoreData = {
  calendars: [
    {
      id: 'cal-default',
      name: 'יומן משפחת ישראלי המורחבת',
      description: 'לוח ימי פטירה (יארצייט) המשפחתי לכל ענפי המשפחה',
      created_by_user_id: 'user-sefi',
      created_by_user_name: 'ספי ישראלי',
      created_at: new Date().toISOString(),
    },
  ],
  branches: [
    {
      id: 'branch-1',
      calendar_id: 'cal-default',
      name: 'ענף סבא ישראל מאיר (צד אבא)',
      color: '#2563eb', // כחול
      created_at: new Date().toISOString(),
    },
    {
      id: 'branch-2',
      calendar_id: 'cal-default',
      name: 'ענף סבתא שרה רבקה (צד אמא)',
      color: '#059669', // ירוק אזמרגד
      created_at: new Date().toISOString(),
    },
    {
      id: 'branch-3',
      calendar_id: 'cal-default',
      name: 'ענף משפחת כהן (מחותנים)',
      color: '#d97706', // ענבר / זהב
      created_at: new Date().toISOString(),
    },
  ],
  deceased: [
    {
      id: 'dec-1',
      calendar_id: 'cal-default',
      branch_id: 'branch-1',
      first_name: 'ישראל מאיר',
      last_name: 'ישראלי',
      father_or_mother_name: 'בן אברהם',
      hebrew_day: 17,
      hebrew_month: 'Adar',
      hebrew_year: 5742,
      gregorian_original_date: '1982-03-12',
      after_sunset: true,
      leap_year_preference: 'Adar II',
      notes: 'קבור בהר המנוחות גוש ב׳, לומר משניות אותיות נשמה',
      created_at: new Date().toISOString(),
    },
    {
      id: 'dec-2',
      calendar_id: 'cal-default',
      branch_id: 'branch-2',
      first_name: 'שרה רבקה',
      last_name: 'לוי',
      father_or_mother_name: 'בת חיים',
      hebrew_day: 24,
      hebrew_month: 'Tevet',
      hebrew_year: 5755,
      gregorian_original_date: '1994-12-27',
      after_sunset: false,
      leap_year_preference: 'Adar II',
      notes: 'צדקה לעילוי נשמתה ביום הפטירה',
      created_at: new Date().toISOString(),
    },
    {
      id: 'dec-3',
      calendar_id: 'cal-default',
      branch_id: 'branch-3',
      first_name: 'יוסף שלום',
      last_name: 'כהן',
      father_or_mother_name: 'בן יצחק',
      hebrew_day: 9,
      hebrew_month: 'Av',
      hebrew_year: 5763,
      gregorian_original_date: '2003-08-07',
      after_sunset: false,
      leap_year_preference: 'Adar II',
      notes: 'קבור בסגולה בפתח תקווה',
      created_at: new Date().toISOString(),
    },
  ],
  memberships: [
    {
      id: 'mem-1',
      calendar_id: 'cal-default',
      user_email: 'sefi@example.com',
      user_name: 'ספי ישראלי',
      role: 'admin',
      feed_token: 'feed-all-branches-demo',
      selected_branch_ids: ['branch-1', 'branch-2', 'branch-3'],
    },
    {
      id: 'mem-2',
      calendar_id: 'cal-default',
      user_email: 'dan@example.com',
      user_name: 'דן (צד אבא בלבד)',
      role: 'member',
      feed_token: 'feed-branch-1-demo',
      selected_branch_ids: ['branch-1'],
    },
  ],
};

function ensureDataFile(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return INITIAL_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error accessing data file:', err);
    return INITIAL_DATA;
  }
}

function saveDataFile(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data file:', err);
  }
}

export const DataStore = {
  getAll(): StoreData {
    return ensureDataFile();
  },

  getCalendar(calendarId: string): CalendarProject | undefined {
    const data = ensureDataFile();
    return data.calendars.find(c => c.id === calendarId);
  },

  addCalendar(calendar: CalendarProject) {
    const data = ensureDataFile();
    data.calendars.push(calendar);
    saveDataFile(data);
    return calendar;
  },

  getBranches(calendarId: string): FamilyBranch[] {
    const data = ensureDataFile();
    return data.branches.filter(b => b.calendar_id === calendarId);
  },

  addBranch(branch: FamilyBranch) {
    const data = ensureDataFile();
    data.branches.push(branch);
    saveDataFile(data);
    return branch;
  },

  deleteBranch(branchId: string) {
    const data = ensureDataFile();
    data.branches = data.branches.filter(b => b.id !== branchId);
    // Also remove deceased in this branch
    data.deceased = data.deceased.filter(d => d.branch_id !== branchId);
    saveDataFile(data);
  },

  getDeceased(calendarId: string): DeceasedPerson[] {
    const data = ensureDataFile();
    return data.deceased.filter(d => d.calendar_id === calendarId);
  },

  addDeceased(deceased: DeceasedPerson) {
    const data = ensureDataFile();
    data.deceased.push(deceased);
    saveDataFile(data);
    return deceased;
  },

  updateDeceased(id: string, updates: Partial<DeceasedPerson>) {
    const data = ensureDataFile();
    const idx = data.deceased.findIndex(d => d.id === id);
    if (idx !== -1) {
      data.deceased[idx] = { ...data.deceased[idx], ...updates };
      saveDataFile(data);
      return data.deceased[idx];
    }
    return null;
  },

  deleteDeceased(id: string) {
    const data = ensureDataFile();
    data.deceased = data.deceased.filter(d => d.id !== id);
    saveDataFile(data);
  },

  getMembershipByToken(feedToken: string): { membership: UserMembership; calendar: CalendarProject } | null {
    const data = ensureDataFile();
    const membership = data.memberships.find(m => m.feed_token === feedToken);
    if (!membership) return null;
    const calendar = data.calendars.find(c => c.id === membership.calendar_id);
    if (!calendar) return null;
    return { membership, calendar };
  },

  saveMembership(membership: UserMembership) {
    const data = ensureDataFile();
    const idx = data.memberships.findIndex(
      m => m.calendar_id === membership.calendar_id && m.user_email === membership.user_email
    );
    if (idx !== -1) {
      data.memberships[idx] = membership;
    } else {
      data.memberships.push(membership);
    }
    saveDataFile(data);
    return membership;
  },
};
