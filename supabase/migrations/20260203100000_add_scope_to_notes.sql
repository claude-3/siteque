-- Add scope column to sitecue_notes
ALTER TABLE sitecue_notes ADD COLUMN scope text NOT NULL DEFAULT 'domain';

-- Add check constraint to ensure only 'domain' or 'exact' values are allowed
ALTER TABLE sitecue_notes ADD CONSTRAINT sitecue_notes_scope_check CHECK (scope IN ('domain', 'exact'));
