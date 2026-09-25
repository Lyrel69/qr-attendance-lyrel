# QR Attendance - Lyrel v1.2

Complete Expo SDK 57 + Supabase QR attendance app for student and teacher accounts.

## Included in this version
- Student and Teacher sign up/sign in
- Student Home, QR Scanner, Attendance History, and Profile
- Teacher dashboard, Create Event, Attendance, History, and Profile
- Five-tab teacher navigation: Home, Scan, History, Profile, Teacher
- Event title and editable unique event code
- Event **Start date/time** and **End date/time** pickers
- Quick end-time buttons: +30 min, +1 hour, +2 hours
- Automatic event `created_at` timestamp from Supabase
- Event history showing created time, start/end time, attendee count, and present students
- QR code generation for each event
- Attendance records store the scan time (`scanned_at`)
- Duplicate attendance protection
- Scanner blocks attendance before the event starts or after it ends
- Profile screen with email, user ID, student ID (students), edit-name, and sign out
- Supabase RLS policies for profiles, events, and attendance
- Dark navy / purple / blue visual system

## Supabase setup
1. Copy `.env.example` to `.env`.
2. Add your Supabase URL and publishable key.
3. Run the complete `supabase/schema.sql` in the Supabase SQL Editor. It is written to be safe for an existing project and adds the event timing columns if needed.
4. Run `npm install`.
5. Run `npx expo start -c`.

## Important for an existing APK
Changing the JavaScript/TypeScript source does not change an already-installed APK. Build a new APK with EAS after installing dependencies.

Example:

`npx expo install @expo/ui`

then:

`eas build --profile preview --platform android`

The preview profile is already configured to produce an APK.
