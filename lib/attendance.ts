import { supabase } from "./supabase";
import { getEventByCode } from "./events";
import { parseQRPayload } from "./qr";

export type RegisterResult = { success: true; message: string; eventTitle: string } | { success: false; message: string };

export type StudentAttendance = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
};

export type TeacherEventSummary = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  attendeeCount: number;
};

export async function registerAttendance(rawPayload: string, studentId: string): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) return { success: false, message: parsed.message };

  const event = await getEventByCode(parsed.payload.event);
  if (!event) return { success: false, message: "Attendance event not found. Ask your teacher for the current QR code." };

  const now = Date.now();
  if (event.start_time && now < new Date(event.start_time).getTime()) {
    return { success: false, message: `Attendance has not started yet. It starts at ${new Date(event.start_time).toLocaleString()}.` };
  }
  if (event.end_time && now > new Date(event.end_time).getTime()) {
    return { success: false, message: `Attendance is closed. It ended at ${new Date(event.end_time).toLocaleString()}.` };
  }

  const { error } = await supabase.from("attendance").insert({ student_id: studentId, event_id: event.id });
  if (error?.code === "23505") return { success: false, message: "Attendance has already been recorded for this event." };
  if (error) return { success: false, message: error.message };

  return { success: true, message: "Attendance recorded successfully.", eventTitle: event.title };
}

export async function getAttendanceHistory(studentId: string): Promise<any[]> {
  const { data: rows, error } = await supabase
    .from("attendance")
    .select("id,student_id,event_id,scanned_at")
    .eq("student_id", studentId)
    .order("scanned_at", { ascending: false });
  if (error) throw error;

  const eventIds = [...new Set((rows ?? []).map((row) => row.event_id))];
  if (!eventIds.length) return [];

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id,title,event_code,start_time,end_time")
    .in("id", eventIds);
  if (eventsError) throw eventsError;

  return (rows ?? []).map((row) => ({ ...row, event: (events ?? []).find((event) => event.id === row.event_id) }));
}

export async function getTeacherEventSummary(teacherId: string): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id,event_code,title,start_time,end_time,created_at")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });
  if (eventError) throw eventError;
  if (!events?.length) return [];

  const eventIds = events.map((event) => event.id);
  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance")
    .select("event_id")
    .in("event_id", eventIds);
  if (attendanceError) throw attendanceError;

  const counts: Record<string, number> = {};
  for (const row of attendance ?? []) counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;

  return events.map((event) => ({ ...event, attendeeCount: counts[event.id] ?? 0 }));
}

export type TeacherEventAttendance = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  attendees: { id: string; name: string; scanned_at: string }[];
};

export async function getTeacherEventAttendance(teacherId: string): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id,event_code,title,start_time,end_time,created_at")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });
  if (eventError) throw eventError;
  if (!events?.length) return [];

  const eventIds = events.map((event) => event.id);
  const { data: rows, error: attendanceError } = await supabase
    .from("attendance")
    .select("id,event_id,student_id,scanned_at")
    .in("event_id", eventIds)
    .order("scanned_at", { ascending: false });
  if (attendanceError) throw attendanceError;

  const studentIds = [...new Set((rows ?? []).map((row) => row.student_id))];
  let profiles: { id: string; full_name: string | null }[] = [];
  if (studentIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", studentIds);
    if (error) throw error;
    profiles = data ?? [];
  }

  return events.map((event) => ({
    ...event,
    attendees: (rows ?? [])
      .filter((row) => row.event_id === event.id)
      .map((row) => ({
        id: row.id,
        name: profiles.find((profile) => profile.id === row.student_id)?.full_name || "Student",
        scanned_at: row.scanned_at,
      })),
  }));
}
