export interface CalendarProject {
  id: string;
  name: string;
  description?: string;
  created_by_user_id: string;
  created_by_user_name: string;
  created_at: string;
}

export interface FamilyBranch {
  id: string;
  calendar_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DeceasedPerson {
  id: string;
  calendar_id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  father_or_mother_name?: string;
  hebrew_day: number;
  hebrew_month: string;
  hebrew_year: number;
  gregorian_original_date?: string;
  after_sunset: boolean;
  leap_year_preference?: 'Adar II' | 'Adar I' | 'both';
  notes?: string;
  created_at: string;
}

export interface UserMembership {
  id: string;
  calendar_id: string;
  user_email: string;
  user_name: string;
  role: 'admin' | 'member';
  feed_token: string;
  selected_branch_ids: string[];
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}
