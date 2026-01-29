drop extension if exists "pg_net";


  create table "public"."sitecue_notes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "url_pattern" text not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."sitecue_notes" enable row level security;


  create table "public"."todo01_profiles" (
    "id" uuid not null,
    "display_name" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."todo01_profiles" enable row level security;


  create table "public"."todo01_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "is_complete" boolean default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."todo01_tasks" enable row level security;

CREATE UNIQUE INDEX sitecue_notes_pkey ON public.sitecue_notes USING btree (id);

CREATE INDEX sitecue_notes_url_idx ON public.sitecue_notes USING btree (url_pattern);

CREATE INDEX sitecue_notes_user_idx ON public.sitecue_notes USING btree (user_id);

CREATE UNIQUE INDEX todo01_profiles_pkey ON public.todo01_profiles USING btree (id);

CREATE UNIQUE INDEX todo01_tasks_pkey ON public.todo01_tasks USING btree (id);

alter table "public"."sitecue_notes" add constraint "sitecue_notes_pkey" PRIMARY KEY using index "sitecue_notes_pkey";

alter table "public"."todo01_profiles" add constraint "todo01_profiles_pkey" PRIMARY KEY using index "todo01_profiles_pkey";

alter table "public"."todo01_tasks" add constraint "todo01_tasks_pkey" PRIMARY KEY using index "todo01_tasks_pkey";

alter table "public"."sitecue_notes" add constraint "sitecue_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."sitecue_notes" validate constraint "sitecue_notes_user_id_fkey";

alter table "public"."todo01_profiles" add constraint "todo01_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."todo01_profiles" validate constraint "todo01_profiles_id_fkey";

alter table "public"."todo01_tasks" add constraint "todo01_tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.todo01_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."todo01_tasks" validate constraint "todo01_tasks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user_todo01()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.todo01_profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$
;

grant delete on table "public"."sitecue_notes" to "anon";

grant insert on table "public"."sitecue_notes" to "anon";

grant references on table "public"."sitecue_notes" to "anon";

grant select on table "public"."sitecue_notes" to "anon";

grant trigger on table "public"."sitecue_notes" to "anon";

grant truncate on table "public"."sitecue_notes" to "anon";

grant update on table "public"."sitecue_notes" to "anon";

grant delete on table "public"."sitecue_notes" to "authenticated";

grant insert on table "public"."sitecue_notes" to "authenticated";

grant references on table "public"."sitecue_notes" to "authenticated";

grant select on table "public"."sitecue_notes" to "authenticated";

grant trigger on table "public"."sitecue_notes" to "authenticated";

grant truncate on table "public"."sitecue_notes" to "authenticated";

grant update on table "public"."sitecue_notes" to "authenticated";

grant delete on table "public"."sitecue_notes" to "service_role";

grant insert on table "public"."sitecue_notes" to "service_role";

grant references on table "public"."sitecue_notes" to "service_role";

grant select on table "public"."sitecue_notes" to "service_role";

grant trigger on table "public"."sitecue_notes" to "service_role";

grant truncate on table "public"."sitecue_notes" to "service_role";

grant update on table "public"."sitecue_notes" to "service_role";

grant delete on table "public"."todo01_profiles" to "anon";

grant insert on table "public"."todo01_profiles" to "anon";

grant references on table "public"."todo01_profiles" to "anon";

grant select on table "public"."todo01_profiles" to "anon";

grant trigger on table "public"."todo01_profiles" to "anon";

grant truncate on table "public"."todo01_profiles" to "anon";

grant update on table "public"."todo01_profiles" to "anon";

grant delete on table "public"."todo01_profiles" to "authenticated";

grant insert on table "public"."todo01_profiles" to "authenticated";

grant references on table "public"."todo01_profiles" to "authenticated";

grant select on table "public"."todo01_profiles" to "authenticated";

grant trigger on table "public"."todo01_profiles" to "authenticated";

grant truncate on table "public"."todo01_profiles" to "authenticated";

grant update on table "public"."todo01_profiles" to "authenticated";

grant delete on table "public"."todo01_profiles" to "service_role";

grant insert on table "public"."todo01_profiles" to "service_role";

grant references on table "public"."todo01_profiles" to "service_role";

grant select on table "public"."todo01_profiles" to "service_role";

grant trigger on table "public"."todo01_profiles" to "service_role";

grant truncate on table "public"."todo01_profiles" to "service_role";

grant update on table "public"."todo01_profiles" to "service_role";

grant delete on table "public"."todo01_tasks" to "anon";

grant insert on table "public"."todo01_tasks" to "anon";

grant references on table "public"."todo01_tasks" to "anon";

grant select on table "public"."todo01_tasks" to "anon";

grant trigger on table "public"."todo01_tasks" to "anon";

grant truncate on table "public"."todo01_tasks" to "anon";

grant update on table "public"."todo01_tasks" to "anon";

grant delete on table "public"."todo01_tasks" to "authenticated";

grant insert on table "public"."todo01_tasks" to "authenticated";

grant references on table "public"."todo01_tasks" to "authenticated";

grant select on table "public"."todo01_tasks" to "authenticated";

grant trigger on table "public"."todo01_tasks" to "authenticated";

grant truncate on table "public"."todo01_tasks" to "authenticated";

grant update on table "public"."todo01_tasks" to "authenticated";

grant delete on table "public"."todo01_tasks" to "service_role";

grant insert on table "public"."todo01_tasks" to "service_role";

grant references on table "public"."todo01_tasks" to "service_role";

grant select on table "public"."todo01_tasks" to "service_role";

grant trigger on table "public"."todo01_tasks" to "service_role";

grant truncate on table "public"."todo01_tasks" to "service_role";

grant update on table "public"."todo01_tasks" to "service_role";


  create policy "Users can delete their own notes"
  on "public"."sitecue_notes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own notes"
  on "public"."sitecue_notes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own notes"
  on "public"."sitecue_notes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own notes"
  on "public"."sitecue_notes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own profile"
  on "public"."todo01_profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."todo01_profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."todo01_profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can perform all operations on own tasks"
  on "public"."todo01_tasks"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



