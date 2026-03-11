-- Drop the existing constraint
ALTER TABLE sitecue_notes DROP CONSTRAINT sitecue_notes_scope_check;

-- Add the new constraint allowing 'inbox'
ALTER TABLE sitecue_notes ADD CONSTRAINT sitecue_notes_scope_check CHECK (scope IN ('domain', 'exact', 'inbox'));
