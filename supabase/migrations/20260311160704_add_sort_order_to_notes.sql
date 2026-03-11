ALTER TABLE sitecue_notes
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 as new_sort_order
  FROM sitecue_notes
)
UPDATE sitecue_notes
SET sort_order = numbered.new_sort_order
FROM numbered
WHERE sitecue_notes.id = numbered.id;
