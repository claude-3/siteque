-- Create sitecue_profiles table
create table if not exists public.sitecue_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.sitecue_profiles enable row level security;

-- Create policies
create policy "Users can view their own profile."
  on public.sitecue_profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.sitecue_profiles for update
  using ( auth.uid() = id );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.sitecue_profiles (id, plan)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to check note limit
create or replace function public.check_note_limit()
returns trigger as $$
declare
  user_plan text;
  note_count int;
begin
  -- Get user plan
  select plan into user_plan
  from public.sitecue_profiles
  where id = auth.uid();

  -- If plan is free, check count
  if user_plan = 'free' then
    select count(*) into note_count
    from public.sitecue_notes
    where user_id = auth.uid();

    if note_count >= 200 then
      raise exception 'Free plan limit reached (200 notes). Please upgrade to Pro.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for note limit (before insert)
create or replace trigger on_note_created_check_limit
  before insert on public.sitecue_notes
  for each row execute procedure public.check_note_limit();

-- Backfill existing users
insert into public.sitecue_profiles (id, plan)
select id, 'free'
from auth.users
where id not in (select id from public.sitecue_profiles);
