-- Migration to add ON DELETE CASCADE to sitecue_notes.user_id foreign key

-- Drop the existing constraint (assuming default name sitecue_notes_user_id_fkey)
ALTER TABLE sitecue_notes
DROP CONSTRAINT IF EXISTS sitecue_notes_user_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE sitecue_notes
ADD CONSTRAINT sitecue_notes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
