-- ============================================================
-- QR-ATT — Supabase PostgreSQL Schema
-- Mirrors the profiles, events, and attendance tables used by
-- the mobile app. Safe to re-run for an existing installation.
--
-- Run the ENTIRE file in Supabase Dashboard > SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PROFILES
-- One public profile per Supabase Auth account.
-- Name and role are populated from signup metadata by a trigger.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill profiles for accounts that existed before this schema.
-- Drop the role-protection trigger first so this migration is repeatable.
drop trigger if exists profiles_prevent_role_change on public.profiles;

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  case when u.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end
from auth.users u
on conflict (id) do update set
  email = coalesce(nullif(excluded.email, ''), public.profiles.email),
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  role = case
    when excluded.role = 'teacher' then 'teacher'
    else public.profiles.role
  end,
  updated_at = now();

-- Enforce supported role values even on older tables.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

-- ------------------------------------------------------------
-- 2. EVENTS
-- event_code is the unique code embedded in the QR payload.
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events add column if not exists event_code text;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists start_time timestamptz;
alter table public.events add column if not exists end_time timestamptz;
alter table public.events add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.events add column if not exists created_at timestamptz not null default now();

-- ------------------------------------------------------------
-- 3. ATTENDANCE
-- One attendance row per student per event.
-- ------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

alter table public.attendance add column if not exists student_id uuid references auth.users (id) on delete cascade;
alter table public.attendance add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.attendance add column if not exists scanned_at timestamptz not null default now();

create unique index if not exists attendance_student_event_unique
  on public.attendance (student_id, event_id);
create unique index if not exists events_event_code_unique
  on public.events (event_code);
create index if not exists events_created_by_created_at_idx
  on public.events (created_by, created_at desc);
create index if not exists attendance_event_id_idx
  on public.attendance (event_id);
create index if not exists attendance_student_id_scanned_at_idx
  on public.attendance (student_id, scanned_at desc);

-- ------------------------------------------------------------
-- 4. FUNCTIONS AND TRIGGERS
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
    else 'student'
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    requested_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

-- Prevent a normal authenticated user from promoting their own account
-- by editing public.profiles.role. Signup metadata is used only by the
-- trusted auth.users trigger above.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and coalesce(current_setting('app.admin_role_change', true), '') <> 'on' then
    raise exception 'Profile role cannot be changed by the account owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

-- SECURITY DEFINER helpers avoid policy recursion when checking profiles.
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Admin-only role management. Public signup can never request admin.
create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change user roles';
  end if;
  if new_role not in ('student', 'teacher') then
    raise exception 'Role must be student or teacher';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own administrator role';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'User profile not found';
  end if;
  if exists (select 1 from public.profiles where id = target_user_id and role = 'admin') then
    raise exception 'Administrator accounts cannot be changed through this function';
  end if;
  perform set_config('app.admin_role_change', 'on', true);
  update public.profiles set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;
revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

-- Profiles: users see/update their own profile. Teachers may see
-- names of students who attended events created by that teacher.
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Teachers can view profiles of their attendees" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_teacher_attendees on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_admin_select
  on public.profiles for select
  using (public.is_admin());

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_teacher_attendees
  on public.profiles for select
  using (
    public.is_teacher()
    and exists (
      select 1
      from public.attendance a
      join public.events e on e.id = a.event_id
      where a.student_id = profiles.id
        and e.created_by = auth.uid()
    )
  );

-- Events: authenticated users may look up QR event details. Only a
-- teacher may create/update/delete their own events.
drop policy if exists "Events are readable by any authenticated user" on public.events;
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists events_select_authenticated on public.events;
drop policy if exists events_insert_authenticated on public.events;
drop policy if exists events_update_owner on public.events;
drop policy if exists events_delete_owner on public.events;
drop policy if exists events_admin_update on public.events;
drop policy if exists events_admin_delete on public.events;

create policy events_select_authenticated
  on public.events for select
  using (auth.role() = 'authenticated');

create policy events_insert_authenticated
  on public.events for insert
  with check (auth.uid() = created_by and public.is_teacher());

create policy events_update_owner
  on public.events for update
  using (auth.uid() = created_by and public.is_teacher())
  with check (auth.uid() = created_by and public.is_teacher());

create policy events_delete_owner
  on public.events for delete
  using (auth.uid() = created_by and public.is_teacher());

create policy events_admin_update
  on public.events for update
  using (public.is_admin())
  with check (public.is_admin());

create policy events_admin_delete
  on public.events for delete
  using (public.is_admin());

-- Attendance: students insert/read their own records; teachers read
-- attendance for events they created.
drop policy if exists "Students can view their own attendance" on public.attendance;
drop policy if exists "Students can insert their own attendance" on public.attendance;
drop policy if exists "Teachers can view attendance for their events" on public.attendance;
drop policy if exists attendance_select_own on public.attendance;
drop policy if exists attendance_insert_own on public.attendance;
drop policy if exists attendance_teacher_select on public.attendance;
drop policy if exists attendance_admin_select on public.attendance;

create policy attendance_select_own
  on public.attendance for select
  using (auth.uid() = student_id);

create policy attendance_insert_own
  on public.attendance for insert
  with check (auth.uid() = student_id and public.is_student());

create policy attendance_teacher_select
  on public.attendance for select
  using (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and e.created_by = auth.uid()
        and public.is_teacher()
    )
  );

-- No update/delete policies for attendance: records cannot be altered
-- or removed by regular app users.


create policy attendance_admin_select
  on public.attendance for select
  using (public.is_admin());
