# QR Attendance - Lyrel

QR Attendance is an Expo / React Native app backed by Supabase. Students scan an event QR code to record attendance. Teachers create events and review their own event records. Administrators can manage user roles and monitor all events and attendance.

## Main features

- Student and teacher account registration and sign-in (admin registration is disabled)
- Admin dashboard with user, event, and attendance overviews
- Admin role management for student/teacher accounts with database-side authorization
- Profile with full name, email, role, and user ID
- Teacher event creation and editing, with start/end date and time
- Unique event codes and versioned `v:1` QR payloads
- QR scanning that looks up the event in Supabase before recording attendance
- Student attendance history
- Teacher event history, attendee names, scan times, and attendance counts
- Duplicate scan protection with a unique `(student_id, event_id)` constraint
- Supabase Row Level Security (RLS) policies for profiles, events, and attendance
- Local session persistence through AsyncStorage

## Tech stack

- Expo SDK 57, React Native, TypeScript, Expo Router
- Supabase Auth and PostgreSQL
- `expo-camera` for QR scanning
- `react-native-qrcode-svg` for QR generation
- `@react-native-community/datetimepicker` for event scheduling

## Setup

1. Create or open your Supabase project.
2. Copy `.env.example` to `.env`.
3. Add your own project URL and Supabase publishable/anon key:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Open **Supabase Dashboard → SQL Editor** and run the complete `supabase/schema.sql`.
5. Promote your first admin account using the instructions in `supabase/make_first_admin.sql`. Do not add an admin option to public registration.
6. Install packages with `npm ci`.
7. Start the app with `npx expo start -c`.

For cloud EAS builds, also add the two `EXPO_PUBLIC_...` variables to the EAS `preview` environment. Never put a `service_role` key in a mobile app or any `EXPO_PUBLIC_` variable.

## Database tables

- `profiles`: one display profile per Supabase Auth user (`id`, `email`, `full_name`, `role`, timestamps)
- `events`: teacher-created events and their unique event codes / time windows
- `attendance`: one scan per student per event

The SQL creates a profile automatically after signup. Public signup can request only student or teacher; admin is assigned separately through Supabase SQL. The database protects the role from being changed through the normal profile edit screen, and the admin-only `admin_set_user_role` function permits an administrator to switch users between student and teacher. Teacher event creation and student attendance inserts are also checked by RLS.

If you already ran an older schema that included `profiles.student_id`, this app no longer uses that field. The migration script leaves the old column in place rather than dropping user data.

## Admin setup and permissions

1. Create an ordinary account using the app, then confirm the email if your Supabase settings require it.
2. In Supabase SQL Editor, follow `supabase/make_first_admin.sql` to promote that exact account.
3. Sign in and choose **Admin** on the sign-in screen. The app reads the role from `profiles`; choosing Admin on the sign-in screen does not grant admin access by itself.
4. Admin can view all profiles, events, and attendance records, and change non-admin users between student and teacher. Admin role assignment is intentionally not available from public registration or the role-change buttons.

## QR flow

1. A teacher creates and saves an event.
2. The app generates a QR payload with `v: 1` and the event code.
3. A student scans the QR.
4. The app validates the payload and looks up the event in Supabase.
5. The server-side event start/end values are checked before the app inserts an attendance row.
6. The unique database constraint blocks duplicate attendance.

The scanner still accepts an older code-only QR during migration, but all newly generated QR codes use the versioned JSON format.

## Important notes

- Registering as a teacher grants teacher permissions in this classroom project. For a real school deployment, teacher accounts should be approved by an administrator instead of letting anyone choose the teacher role.
- Do not store sensitive personal data in a QR payload. The QR includes only event details.
- Changing source code does not update an already-installed APK. Build and install a new APK after making code changes.

## Build an Android APK

The `preview` profile in `eas.json` is configured for an internal Android APK build:

```bash
eas build --profile preview --platform android
```

## Key source files

- `lib/supabase.ts` — Supabase client
- `lib/profiles.ts` — profile reads and name updates
- `lib/events.ts` — cloud event operations
- `lib/qr.ts` — QR payload builder and parser
- `lib/attendance.ts` — student scans, student history, teacher attendance queries
- `app/admin.tsx` — admin dashboard and user-role management
- `supabase/schema.sql` — database schema, triggers, indexes, and RLS policies
