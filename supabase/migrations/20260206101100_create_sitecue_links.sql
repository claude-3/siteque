create table "public"."sitecue_links" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "domain" text not null,
    "target_url" text not null,
    "label" text not null,
    "type" text not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."sitecue_links" enable row level security;

CREATE UNIQUE INDEX sitecue_links_pkey ON public.sitecue_links USING btree (id);

alter table "public"."sitecue_links" add constraint "sitecue_links_pkey" PRIMARY KEY using index "sitecue_links_pkey";

alter table "public"."sitecue_links" add constraint "sitecue_links_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."sitecue_links" add constraint "sitecue_links_type_check" CHECK (type = ANY (ARRAY['related'::text, 'env'::text]));

create index "sitecue_links_domain_idx" on "public"."sitecue_links" using btree (domain);

create index "sitecue_links_target_url_idx" on "public"."sitecue_links" using btree (target_url);

create policy "Users can perform all actions on their own links"
on "public"."sitecue_links"
as permissive
for all
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));
