-- Project: SiteCue
-- Description: Chrome Extension context-aware notes
-- Prefix: sitecue_

-- 1. Notes Table
create table if not exists sitecue_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  url_pattern text not null, -- e.g., "github.com" or "github.com/settings"
  content text not null,     -- Markdown content
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table sitecue_notes enable row level security;

-- 3. Policies
-- View own notes
create policy "Users can view their own notes"
on sitecue_notes for select
using (auth.uid() = user_id);

-- Insert own notes
create policy "Users can insert their own notes"
on sitecue_notes for insert
with check (auth.uid() = user_id);

-- Update own notes
create policy "Users can update their own notes"
on sitecue_notes for update
using (auth.uid() = user_id);

-- Delete own notes
create policy "Users can delete their own notes"
on sitecue_notes for delete
using (auth.uid() = user_id);

-- 4. Indexes
create index if not exists sitecue_notes_url_idx on sitecue_notes (url_pattern);
create index if not exists sitecue_notes_user_idx on sitecue_notes (user_id);