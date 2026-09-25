create extension if not exists pgcrypto;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  student_id text,
  role text not null default 'student' check(role in('student','teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists role text default 'student';

create table if not exists public.events(
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Safe migrations for existing Supabase projects.
alter table public.events add column if not exists start_time timestamptz;
alter table public.events add column if not exists end_time timestamptz;
alter table public.events add column if not exists created_at timestamptz not null default now();

create table if not exists public.attendance(
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  unique(student_id,event_id)
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

-- Sync existing profiles with the role and student ID stored in Supabase Auth metadata.
update public.profiles p
set full_name=u.raw_user_meta_data->>'full_name',
    student_id=u.raw_user_meta_data->>'student_id',
    role=coalesce(u.raw_user_meta_data->>'role','student'),
    updated_at=now()
from auth.users u
where p.id=u.id;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,student_id,role)
  values(new.id,coalesce(new.email,''),new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'student_id',coalesce(new.raw_user_meta_data->>'role','student'))
  on conflict (id) do update set email=excluded.email,full_name=excluded.full_name,student_id=excluded.student_id,role=excluded.role,updated_at=now();
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

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
