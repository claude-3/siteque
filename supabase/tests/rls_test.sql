
BEGIN;

-- Enable pgTAP if not already enabled
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(12); -- Update the plan count as we add tests

-- 1. Create test users (helpers)
-- We need to mock auth.users.
-- Since we cannot easily insert into auth.users in standard migrations without raw sql or specific setup,
-- we'll rely on `supautils` or just mocking the `auth.uid()` function if possible,
-- OR better, we insert into `auth.users` if we have permissions.
-- In Supabase local testing, we usually have service_role privileges.

-- Create two test users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com');

-- 2. Create test data (as service_role to ensure it exists)
-- Note 1 created by User 1
INSERT INTO public.sitecue_notes (user_id, url_pattern, content, scope) VALUES
  ('11111111-1111-1111-1111-111111111111', 'https://example.com/*', 'User 1 Note', 'domain');

-- Note 2 created by User 2
INSERT INTO public.sitecue_notes (user_id, url_pattern, content, scope) VALUES
  ('22222222-2222-2222-2222-222222222222', 'https://example.org/*', 'User 2 Note', 'domain');


-- ============================================================
-- Test Case 1: Anonymous User (No Auth)
-- ============================================================

-- Switch to anon role
SET ROLE anon;

-- Should not see any notes
SELECT is(count(*), 0::bigint, 'Anon user should see 0 notes') FROM public.sitecue_notes;

-- Should not be able to insert
PREPARE anon_insert AS INSERT INTO public.sitecue_notes (user_id, url_pattern, content) VALUES ('11111111-1111-1111-1111-111111111111', 'https://hacker.com', 'Hacker Note');
SELECT throws_ok('anon_insert', '42501', NULL, 'Anon user cannot insert notes');


-- ============================================================
-- Test Case 2: Authenticated User 1
-- ============================================================

-- Authenticate as User 1
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET request.jwt.claim.role = 'authenticated';

-- Should see only User 1's notes
SELECT is(count(*), 1::bigint, 'User 1 should see exactly 1 note') FROM public.sitecue_notes;
SELECT results_eq(
    'SELECT content FROM public.sitecue_notes',
    ARRAY['User 1 Note'],
    'User 1 should see their own note content'
);

-- Should be able to insert own note
INSERT INTO public.sitecue_notes (user_id, url_pattern, content, scope)
VALUES ('11111111-1111-1111-1111-111111111111', 'https://test.com', 'User 1 New Note', 'domain');

SELECT is(count(*), 2::bigint, 'User 1 should have 2 notes now') FROM public.sitecue_notes;

-- Should NOT be able to insert note for User 2
PREPARE user1_insert_for_user2 AS INSERT INTO public.sitecue_notes (user_id, url_pattern, content) VALUES ('22222222-2222-2222-2222-222222222222', 'https://malicious.com', 'Malicious Note');
SELECT throws_ok('user1_insert_for_user2', '42501', NULL, 'User 1 cannot insert note for User 2');

-- Should be able to update own note
UPDATE public.sitecue_notes SET content = 'User 1 Updated Note' WHERE content = 'User 1 Note';
SELECT results_eq(
    'SELECT content FROM public.sitecue_notes WHERE content = ''User 1 Updated Note''',
    ARRAY['User 1 Updated Note'],
    'User 1 can update their own note'
);

-- Should be able to delete own note
DELETE FROM public.sitecue_notes WHERE content = 'User 1 Updated Note';
SELECT is(count(*), 1::bigint, 'User 1 should have 1 note after delete') FROM public.sitecue_notes;


-- ============================================================
-- Test Case 3: Authenticated User 2
-- ============================================================

-- Authenticate as User 2
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

-- Should see only User 2's notes
SELECT is(count(*), 1::bigint, 'User 2 should see exactly 1 note') FROM public.sitecue_notes;
SELECT results_eq(
    'SELECT content FROM public.sitecue_notes',
    ARRAY['User 2 Note'],
    'User 2 should see their own note content'
);

-- Should NOT see User 1's notes (User 1 has 1 note left: 'User 1 New Note')
SELECT is_empty(
    'SELECT * FROM public.sitecue_notes WHERE user_id = ''11111111-1111-1111-1111-111111111111''',
    'User 2 should not see User 1 notes'
);

-- Attempt update on User 1's note (should affect 0 rows or throw)
-- In RLS, typically updates purely filters out rows, so it updates 0 rows.
-- Unless utilizing `WITH CHECK`, but here we are selecting rows to update.
PREPARE user2_update_user1 AS UPDATE public.sitecue_notes SET content = 'Hacked' WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- For standard RLS update, it just doesn't find the row.
-- Let's check if rows affected is 0.
-- But standard pgTAP doesn't easily check affected rows count without diagnostics.
-- We can check if content changed.
EXECUTE user2_update_user1;

-- Switch back to Service Role to verify integrity
SET ROLE service_role;
SELECT results_eq(
    'SELECT content FROM public.sitecue_notes WHERE user_id = ''11111111-1111-1111-1111-111111111111''',
    ARRAY['User 1 New Note'],
    'User 1 note should remain unchanged after User 2 update attempt'
);


-- ============================================================
-- Clean up
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
