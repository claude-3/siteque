-- Add note_type column to sitecue_notes table
alter table "public"."sitecue_notes" 
add column "note_type" text not null default 'info',
add constraint "sitecue_notes_note_type_check" check (note_type in ('info', 'alert', 'idea'));
