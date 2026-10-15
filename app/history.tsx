import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { getAttendanceHistory, getTeacherEventAttendance, type TeacherEventAttendance } from "../lib/attendance";
import { getCurrentRole, type Role } from "../lib/profiles";
import { BottomNav } from "../components/BottomNav";

type StudentHistory = {
  id: string;
  scanned_at: string;
  event?: { title: string; event_code: string; start_time: string | null; end_time: string | null };
};

function fmt(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function History() {
  const [role, setRole] = useState<Role>("student");
  const [teacherRows, setTeacherRows] = useState<TeacherEventAttendance[]>([]);
  const [studentRows, setStudentRows] = useState<StudentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      const currentRole = await getCurrentRole(data.user.id);
      setRole(currentRole);
      if (currentRole === "teacher") {
        setTeacherRows(await getTeacherEventAttendance(data.user.id));
      } else {
        setStudentRows(await getAttendanceHistory(data.user.id));
      }
    } catch (error: any) {
      Alert.alert("Could not load history", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={s.root}>
      <View style={s.c}>
        <Text style={s.t}>Attendance History</Text>
        <Text style={s.sub}>{role === "teacher" ? "Events you created and the students who attended." : "Your recorded attendance."}</Text>
        {loading ? <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 40 }} /> : role === "teacher" ? (
          <FlatList
            data={teacherRows}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.secondary} />}
            contentContainerStyle={{ paddingBottom: 130 }}
            ListEmptyComponent={<Text style={s.empty}>No events created yet.</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.titleRow}>
                  <View style={s.iconCircle}><Ionicons name="people-outline" size={25} color={COLORS.secondary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.et}>{item.title}</Text>
                    <Text style={s.code}>{item.event_code}</Text>
                    <Text style={s.created}>Created: {fmt(item.created_at)}</Text>
                    <Text style={s.att}>Attendees: {item.attendees.length}</Text>
                  </View>
                </View>
                <View style={s.line} />
                {item.start_time && <Text style={s.timeInfo}>Starts: {fmt(item.start_time)}</Text>}
                {item.end_time && <Text style={s.timeInfo}>Ends: {fmt(item.end_time)}</Text>}
                <Text style={s.present}>Present Students</Text>
                {item.attendees.length ? item.attendees.map((attendee) => (
                  <View key={attendee.id} style={s.studentRow}>
                    <Ionicons name="checkmark-circle" size={21} color={COLORS.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.student}>{attendee.name}</Text>
                      <Text style={s.studentId}>{fmt(attendee.scanned_at)}</Text>
                    </View>
                  </View>
                )) : <Text style={s.none}>No students have registered attendance yet.</Text>}
              </View>
            )}
          />
        ) : (
          <FlatList
            data={studentRows}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.secondary} />}
            contentContainerStyle={{ paddingBottom: 130 }}
            ListEmptyComponent={<Text style={s.empty}>No attendance records yet.</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <Text style={s.et}>{item.event?.title || "Attendance Event"}</Text>
                <Text style={s.code}>{item.event?.event_code || ""}</Text>
                <Text style={s.created}>Scanned: {fmt(item.scanned_at)}</Text>
                {item.event?.start_time && <Text style={s.timeInfo}>Starts: {fmt(item.event.start_time)}</Text>}
                {item.event?.end_time && <Text style={s.timeInfo}>Ends: {fmt(item.event.end_time)}</Text>}
              </View>
            )}
          />
        )}
      </View>
      <BottomNav role={role} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  c: { flex: 1, padding: 24, paddingTop: 58 },
  t: { color: COLORS.text, fontSize: 30, fontWeight: "900" },
  sub: { color: COLORS.muted, marginTop: 5, marginBottom: 20 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 18, marginBottom: 14 },
  titleRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  iconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  et: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  created: { color: COLORS.muted, marginTop: 5 },
  att: { color: COLORS.success, fontWeight: "900", marginTop: 7 },
  line: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  present: { color: COLORS.text, fontSize: 17, fontWeight: "900", marginBottom: 10, marginTop: 8 },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  student: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  studentId: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  none: { color: COLORS.muted, fontStyle: "italic" },
  code: { color: COLORS.secondary, fontWeight: "900", marginTop: 4 },
  timeInfo: { color: COLORS.muted, fontSize: 12, marginTop: 7 },
  empty: { color: COLORS.muted, textAlign: "center", marginTop: 40 },
});
