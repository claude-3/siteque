-- Add is_resolved column to sitecue_notes table
ALTER TABLE sitecue_notes
ADD COLUMN is_resolved boolean NOT NULL DEFAULT false;
