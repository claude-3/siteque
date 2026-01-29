
  create policy "Enable update for users based on user_id"
  on "public"."sitecue_notes"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



