import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { getCurrentRole, type Role } from "../lib/profiles";
import { BottomNav } from "../components/BottomNav";

type Event = { id: string; title: string; event_code: string };
type Row = { id: string; student_id: string; scanned_at: string; name: string };

export default function TeacherAttendance() {
  const { eventId: rawEventId } = useLocalSearchParams<{ eventId?: string }>();
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<string | undefined>(eventId);
  const [rows, setRows] = useState<Row[]>([]);
  const [role, setRole] = useState<Role>("teacher");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }
      const currentRole = await getCurrentRole(authData.user.id);
      setRole(currentRole);
      if (currentRole !== "teacher") {
        router.replace("/home");
        return;
      }

      const { data: eventRows, error: eventError } = await supabase
        .from("events")
        .select("id,title,event_code")
        .eq("created_by", authData.user.id)
        .order("created_at", { ascending: false });
      if (eventError) throw eventError;
      const availableEvents = eventRows ?? [];
      setEvents(availableEvents);
      const chosen = selected && availableEvents.some((event) => event.id === selected) ? selected : availableEvents[0]?.id;
      if (!chosen) {
        setRows([]);
        return;
      }
      setSelected(chosen);

      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("id,student_id,scanned_at")
        .eq("event_id", chosen)
        .order("scanned_at", { ascending: false });
      if (attendanceError) throw attendanceError;

      const ids = [...new Set((attendance ?? []).map((row) => row.student_id))];
      let profiles: { id: string; full_name: string | null }[] = [];
      if (ids.length) {
        const { data, error } = await supabase.from("profiles").select("id,full_name").in("id", ids);
        if (error) throw error;
        profiles = data ?? [];
      }
      setRows((attendance ?? []).map((row) => ({
        ...row,
        name: profiles.find((profile) => profile.id === row.student_id)?.full_name || "Student",
      })));
    } catch (error: any) {
      Alert.alert("Could not load attendance", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selected]);

  return (
    <View style={s.c}>
      <Pressable onPress={() => router.replace("/teacher")}><Text style={s.back}>‹ Teacher Home</Text></Pressable>
      <Text style={s.t}>Attendance</Text>
      <Text style={s.sub}>Students who scanned the selected event.</Text>
      <Text style={s.label}>Select Event</Text>
      <View style={s.eventRow}>
        {events.map((event) => (
          <Pressable key={event.id} onPress={() => setSelected(event.id)} style={[s.eventPill, selected === event.id && s.eventActive]}>
            <Text style={[s.eventText, selected === event.id && s.eventTextActive]}>{event.title}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 30 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={<Text style={s.empty}>No students have scanned this event yet.</Text>}
          renderItem={({ item, index }) => (
            <View style={s.card}>
              <View style={s.num}><Text style={s.numText}>{index + 1}</Text></View>
              <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.id}>Scanned {new Date(item.scanned_at).toLocaleString()}</Text></View>
            </View>
          )}
        />
      )}
      <BottomNav role={role} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 58 },
  back: { color: COLORS.secondary, fontWeight: "800", marginBottom: 14 },
  t: { color: COLORS.text, fontSize: 30, fontWeight: "800" },
  sub: { color: COLORS.muted, marginTop: 5, marginBottom: 20 },
  label: { color: COLORS.text, fontWeight: "800", marginBottom: 8 },
  eventRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  eventPill: { maxWidth: 220, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10 },
  eventActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  eventText: { color: COLORS.muted, fontWeight: "700" },
  eventTextActive: { color: "#fff" },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  numText: { color: "#fff", fontWeight: "900" },
  name: { color: COLORS.text, fontWeight: "800", fontSize: 16 },
  id: { color: COLORS.muted, marginTop: 3, fontSize: 12 },
  empty: { color: COLORS.muted, textAlign: "center", marginTop: 40, lineHeight: 22 },
});
