import type { Database } from './supabase';

export type NoteScope = 'exact' | 'domain' | 'inbox';

export type Note = Omit<Database['public']['Tables']['sitecue_notes']['Row'], 'scope'> & {
  scope: NoteScope;
};
