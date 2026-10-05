export interface CalendarProject {
  id: string;
  name: string;
  description?: string;
  created_by_user_id: string;
  created_by_user_name: string;
  created_at: string;
  deceased_count?: number;
  branches_count?: number;
}

export interface FamilyBranch {
  id: string;
  calendar_id: string;
  name: string;
  color: string;
  created_at: string;
  is_linked?: boolean;
  source_calendar_id?: string;
  source_calendar_name?: string;
}

export interface LinkedBranchSource {
  membership_id: string;
  source_calendar_id: string;
  source_calendar_name: string;
  source_owner_name: string;
  status: 'pending' | 'approved';
  role: 'admin' | 'editor' | 'member';
  selected_branch_ids: string[];
  target_calendar_id?: string;
}

export interface DeceasedPerson {
  id: string;
  calendar_id: string;
  branch_id: string;
  title?: string;
  first_name: string;
  last_name: string;
  father_or_mother_name?: string;
  gender?: 'male' | 'female';
  generation?: number;
  relationship?: string;
  hebrew_day?: number | null;
  hebrew_month?: string | null;
  hebrew_year?: number | null;
  gregorian_original_date?: string;
  after_sunset: boolean;
  leap_year_preference?: 'Adar II' | 'Adar I' | 'both';
  notes?: string;
  created_at: string;
  lineage_path?: any[];
  geni_profile_id?: string | null;
  is_living?: boolean;
}

export interface UserMembership {
  id: string;
  calendar_id: string;
  user_email: string;
  user_name: string;
  role: 'admin' | 'editor' | 'member';
  feed_token: string;
  selected_branch_ids: string[];
  user_generation?: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}
