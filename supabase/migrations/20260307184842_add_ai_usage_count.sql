ALTER TABLE public.sitecue_profiles ADD COLUMN IF NOT EXISTS ai_usage_count integer not null default 0;
