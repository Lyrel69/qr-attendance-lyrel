-- Supplemental RLS repair for QR-ATT.
-- Recommended: run the full supabase/schema.sql first. This file is
-- retained for existing projects that only need the helper functions
-- and role-aware policies refreshed.

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_teacher_attendees on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_teacher_attendees on public.profiles
  for select using (
    public.is_teacher()
    and exists (
      select 1 from public.attendance a
      join public.events e on e.id = a.event_id
      where a.student_id = profiles.id and e.created_by = auth.uid()
    )
  );

drop policy if exists events_select_authenticated on public.events;
drop policy if exists events_insert_authenticated on public.events;
drop policy if exists events_update_owner on public.events;
drop policy if exists events_delete_owner on public.events;
create policy events_select_authenticated on public.events
  for select using (auth.role() = 'authenticated');
create policy events_insert_authenticated on public.events
  for insert with check (auth.uid() = created_by and public.is_teacher());
create policy events_update_owner on public.events
  for update using (auth.uid() = created_by and public.is_teacher())
  with check (auth.uid() = created_by and public.is_teacher());
create policy events_delete_owner on public.events
  for delete using (auth.uid() = created_by and public.is_teacher());

drop policy if exists attendance_select_own on public.attendance;
drop policy if exists attendance_insert_own on public.attendance;
drop policy if exists attendance_teacher_select on public.attendance;
create policy attendance_select_own on public.attendance
  for select using (auth.uid() = student_id);
create policy attendance_insert_own on public.attendance
  for insert with check (auth.uid() = student_id and public.is_student());
create policy attendance_teacher_select on public.attendance
  for select using (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and e.created_by = auth.uid()
        and public.is_teacher()
    )
  );


-- Admin helper and admin read policies (run after schema.sql).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles for select using (public.is_admin());
drop policy if exists attendance_admin_select on public.attendance;
create policy attendance_admin_select on public.attendance for select using (public.is_admin());
drop policy if exists events_admin_update on public.events;
create policy events_admin_update on public.events for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists events_admin_delete on public.events;
create policy events_admin_delete on public.events for delete using (public.is_admin());
