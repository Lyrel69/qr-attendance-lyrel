-- Helper functions avoid RLS recursion when checking the user's role.
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'student') = 'teacher';
$$;

create or replace function public.is_student()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'student') = 'student';
$$;

-- Profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using(auth.uid()=id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using(auth.uid()=id);
drop policy if exists profiles_teacher_attendees on public.profiles;
create policy profiles_teacher_attendees on public.profiles for select using(
  public.is_teacher() and exists(
    select 1 from public.attendance a
    join public.events e on e.id=a.event_id
    where a.student_id=profiles.id and e.created_by=auth.uid()
  )
);

-- Events
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated on public.events for select using(auth.role()='authenticated');
drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events for insert with check(auth.uid()=created_by and public.is_teacher());
drop policy if exists events_update_owner on public.events;
create policy events_update_owner on public.events for update using(auth.uid()=created_by);
drop policy if exists events_delete_owner on public.events;
create policy events_delete_owner on public.events for delete using(auth.uid()=created_by);

-- Attendance
drop policy if exists attendance_select_own on public.attendance;
create policy attendance_select_own on public.attendance for select using(auth.uid()=student_id);
drop policy if exists attendance_insert_own on public.attendance;
create policy attendance_insert_own on public.attendance for insert with check(auth.uid()=student_id and public.is_student());
drop policy if exists attendance_teacher_select on public.attendance;
create policy attendance_teacher_select on public.attendance for select using(exists(select 1 from public.events e where e.id=attendance.event_id and e.created_by=auth.uid()));

-- Event timing is stored in timestamptz. The app writes start_time/end_time as ISO timestamps.
-- created_at is automatic and records when the event was created.
