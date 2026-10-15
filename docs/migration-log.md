# QR-ATT Supabase Migration Log

This log describes the current implementation in the project archive. Test results are intentionally not marked as passed until the app is installed and tested against the user's own Supabase project.

## Phase 0 — Baseline

- **Purpose:** Document the original local attendance workflow and current project structure.
- **Previous state:** The initial reference architecture used SQLite and a hardcoded student ID.
- **Current status:** The uploaded project is already on Supabase for authentication and attendance.

## Phase 1 — Supabase project setup

- **Files:** `.env.example`, `lib/supabase.ts`, `package.json`
- **Changes:** Standardized the preferred environment variable to `EXPO_PUBLIC_SUPABASE_ANON_KEY`, while retaining the previous `EXPO_PUBLIC_SUPABASE_KEY` as a backward-compatible fallback.
- **Security:** `.env` remains ignored by Git. Use only a publishable/anon key in the client.

## Phase 2 — Authentication

- **Files:** `app/login.tsx`, `app/register.tsx`, `app/_layout.tsx`
- **Changes:** Registration validates required fields and password confirmation. Login validates the requested account type against the role stored in `profiles`.

## Phase 3 — Database design and RLS

- **File:** `supabase/schema.sql`
- **Changes:** Defines `profiles`, `events`, and `attendance`; adds indexes, signup profile trigger, timestamps, helper functions, and row-level security policies.
- **Security:** A normal user cannot promote their own profile to teacher through profile updates. Teacher event operations and student attendance inserts are role-gated.
- **Migration note:** An old `profiles.student_id` column is not dropped automatically, but the updated app does not use it.

## Phase 4–5 — Data services and profiles

- **Files:** `lib/supabase.ts`, `lib/profiles.ts`, `app/profile.tsx`
- **Changes:** Profile lookup and name update operations are centralized. The profile screen displays full name, email, role, and user ID.

## Phase 6–7 — Role-aware attendance and events

- **Files:** `lib/events.ts`, `lib/attendance.ts`, `app/teacher.tsx`, `app/create-event.tsx`, `app/history.tsx`, `app/teacher-attendance.tsx`
- **Changes:** Teacher event access and attendee history are scoped to events created by the signed-in teacher. Student history is scoped to the signed-in student.

## Phase 8–9 — QR format and cloud attendance

- **Files:** `lib/qr.ts`, `lib/attendance.ts`, `app/create-event.tsx`, `app/scan.tsx`
- **Changes:** Newly generated QR codes use a versioned `v:1` JSON payload. Scans are validated, resolved against a saved cloud event, checked against the event's authoritative start/end time, and inserted into the cloud attendance table.
- **Compatibility:** The scanner still accepts older plain event-code QR stickers during migration.

## Phase 10 — Efficient teacher summary

- **File:** `lib/attendance.ts`
- **Changes:** `getTeacherEventSummary` fetches only `event_id` values to count attendance instead of downloading all attendee details.

## Validation status

- Source-level consistency checks are included with this delivery.
- Runtime verification still requires the user's Supabase project credentials and testing on a device or emulator.


## Admin role addition

- Added `admin` to the supported profile roles without allowing public signup to request it.
- Added admin-only database policies to read all profiles and attendance and manage event records.
- Added `admin_set_user_role` RPC, which verifies the caller is an admin and only permits switching another account between student and teacher.
- Added `/admin` dashboard with account counts, user list and role controls, all-event listing, and attendance overview.
- Added first-admin SQL promotion instructions in `supabase/make_first_admin.sql`.
