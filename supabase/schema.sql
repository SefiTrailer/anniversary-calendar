-- Create tables for Family Yahrzeit Calendar
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by_user_id TEXT NOT NULL,
  created_by_user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deceased (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  father_or_mother_name TEXT,
  hebrew_day INT NOT NULL,
  hebrew_month TEXT NOT NULL,
  hebrew_year INT NOT NULL,
  gregorian_original_date DATE,
  after_sunset BOOLEAN DEFAULT false,
  leap_year_preference TEXT DEFAULT 'Adar II',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin' | 'member'
  feed_token UUID UNIQUE DEFAULT gen_random_uuid(),
  selected_branch_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy iCal feed lookup
CREATE INDEX IF NOT EXISTS idx_calendar_members_feed_token ON calendar_members(feed_token);
