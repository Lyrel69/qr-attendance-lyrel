-- Promote an existing, trusted account to the first administrator.
-- 1. Register normally in the app and confirm the email if required.
-- 2. Replace the email below with that exact account email.
-- 3. Run this script in Supabase Dashboard > SQL Editor as project owner.
-- Do not put the service_role key in the app.

begin;

-- This local transaction flag permits the protected role trigger to accept
-- this explicit owner-run promotion. It does not persist after this transaction.
select set_config('app.admin_role_change', 'on', true);

update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = lower('REPLACE-WITH-YOUR-ACCOUNT-EMAIL')
returning id, email, full_name, role;

-- Verify exactly one row was updated before committing. If zero rows were
-- updated, check the email/profile and rerun with the correct address.
commit;

-- After running, sign in with that account and choose Admin on the login page.
