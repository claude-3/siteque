create table sitecue_domain_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  domain text not null,
  label text,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, domain)
);

alter table sitecue_domain_settings enable row level security;

create policy "Users can view their own domain settings"
  on sitecue_domain_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own domain settings"
  on sitecue_domain_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own domain settings"
  on sitecue_domain_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own domain settings"
  on sitecue_domain_settings for delete
  using (auth.uid() = user_id);
