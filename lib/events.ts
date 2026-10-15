import { supabase } from "./supabase";

export type EventInput = {
  eventId?: string;
  title: string;
  eventCode: string;
  start: string | null;
  end: string | null;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
};

export async function getEventByCode(eventCode: string): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id,event_code,title,start_time,end_time,created_by,created_at")
    .eq("event_code", eventCode.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return (data as CloudEvent | null) ?? null;
}

export async function getEventsByTeacher(teacherId: string): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id,event_code,title,start_time,end_time,created_by,created_at")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CloudEvent[];
}

export async function createEvent(input: EventInput): Promise<{ event: CloudEvent | null; error: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { event: null, error: "Please sign in again." };

  const row = {
    title: input.title.trim(),
    event_code: input.eventCode.trim().toUpperCase(),
    start_time: input.start,
    end_time: input.end,
    created_by: authData.user.id,
  };

  if (input.eventId) {
    const { data, error } = await supabase
      .from("events")
      .update(row)
      .eq("id", input.eventId)
      .eq("created_by", authData.user.id)
      .select("id,event_code,title,start_time,end_time,created_by,created_at")
      .single();
    return { event: (data as CloudEvent | null) ?? null, error: error?.message ?? null };
  }

  const { data, error } = await supabase
    .from("events")
    .insert(row)
    .select("id,event_code,title,start_time,end_time,created_by,created_at")
    .single();
  return { event: (data as CloudEvent | null) ?? null, error: error?.message ?? null };
}
