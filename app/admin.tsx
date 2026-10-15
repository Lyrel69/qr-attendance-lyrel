import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";
import { getCurrentRole } from "../lib/profiles";

type Tab = "users" | "events" | "attendance";
type UserRow = { id: string; email: string; full_name: string | null; role: "student" | "teacher" | "admin"; created_at?: string };
type EventRow = { id: string; title: string; event_code: string; created_by: string | null; created_at: string; start_time: string | null; end_time: string | null };
type AttendanceRow = { id: string; student_id: string; event_id: string; scanned_at: string };

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("users");
  const [adminName, setAdminName] = useState("Admin");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(auth.user.id);
    const role = await getCurrentRole(auth.user.id);
    if (role !== "admin") {
      router.replace(role === "teacher" ? "/teacher" : "/home");
      return;
    }

    const [profilesResult, eventsResult, attendanceResult] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,role,created_at").order("created_at", { ascending: false }),
      supabase.from("events").select("id,title,event_code,created_by,created_at,start_time,end_time").order("created_at", { ascending: false }),
      supabase.from("attendance").select("id,student_id,event_id,scanned_at").order("scanned_at", { ascending: false }),
    ]);
    if (profilesResult.error || eventsResult.error || attendanceResult.error) {
      setErrorMessage(profilesResult.error?.message || eventsResult.error?.message || attendanceResult.error?.message || "Could not load admin data.");
    }
    setUsers((profilesResult.data || []) as UserRow[]);
    setEvents((eventsResult.data || []) as EventRow[]);
    setAttendance((attendanceResult.data || []) as AttendanceRow[]);
    const ownProfile = profilesResult.data?.find((profile) => profile.id === auth.user.id);
    if (ownProfile?.full_name) setAdminName(ownProfile.full_name);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeRole(user: UserRow, role: "student" | "teacher") {
    if (user.id === currentUserId) {
      Alert.alert("Protected account", "You cannot change your own administrator role here.");
      return;
    }
    const label = user.full_name || user.email || "this user";
    Alert.alert("Change account role", `Change ${label} to ${role}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        setChangingRoleId(user.id);
        const { error } = await supabase.rpc("admin_set_user_role", { target_user_id: user.id, new_role: role });
        setChangingRoleId(null);
        if (error) return Alert.alert("Could not change role", error.message);
        Alert.alert("Role updated", `${label} is now a ${role}.`);
        await load();
      } },
    ]);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return Alert.alert("Sign out failed", error.message);
    router.replace("/login");
  }

  const eventById = new Map(events.map((event) => [event.id, event] as const));
  const userById = new Map(users.map((user) => [user.id, user] as const));
  const studentCount = users.filter((user) => user.role === "student").length;
  const teacherCount = users.filter((user) => user.role === "teacher").length;
  const adminCount = users.filter((user) => user.role === "admin").length;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={{ flex: 1 }}><Text style={s.badge}>ADMINISTRATOR • LYREL</Text><Text style={s.title}>Welcome, {adminName} 🛡️</Text><Text style={s.subtitle}>Manage accounts and monitor attendance across the system.</Text></View>
          <Pressable onPress={logout}><Text style={s.logout}>Logout</Text></Pressable>
        </View>

        <View style={s.statsRow}>
          <Stat label="Students" value={studentCount} />
          <Stat label="Teachers" value={teacherCount} />
          <Stat label="Admins" value={adminCount} />
        </View>
        <View style={s.statsRow}>
          <Stat label="Events" value={events.length} />
          <Stat label="Attendance" value={attendance.length} />
        </View>

        <View style={s.tabs}>
          {(["users", "events", "attendance"] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, tab === item && s.activeTab]}><Text style={[s.tabText, tab === item && s.activeTabText]}>{item === "users" ? "Users" : item === "events" ? "Events" : "Attendance"}</Text></Pressable>)}
        </View>

        {loading ? <ActivityIndicator color={COLORS.secondary} size="large" style={{ marginTop: 36 }} /> : errorMessage ? <View style={s.notice}><Text style={s.errorTitle}>Unable to load admin data</Text><Text style={s.noticeText}>{errorMessage}</Text><Pressable style={s.smallButton} onPress={() => void load()}><Text style={s.smallButtonText}>Try again</Text></Pressable></View> : <>
          {tab === "users" && <>
            <Text style={s.sectionTitle}>Registered Accounts ({users.length})</Text>
            {users.map((user) => <View key={user.id} style={s.card}>
              <View style={s.cardTop}><View style={{ flex: 1 }}><Text style={s.cardTitle}>{user.full_name || "Unnamed user"}</Text><Text style={s.cardSub}>{user.email}</Text></View><View style={[s.roleBadge, user.role === "admin" && s.adminBadge]}><Text style={s.roleBadgeText}>{user.role.toUpperCase()}</Text></View></View>
              {user.created_at && <Text style={s.muted}>Joined {new Date(user.created_at).toLocaleDateString()}</Text>}
              {user.role !== "admin" && user.id !== currentUserId && <View style={s.actions}><Pressable disabled={changingRoleId === user.id || user.role === "student"} style={[s.roleAction, user.role === "student" && s.actionDisabled]} onPress={() => void changeRole(user, "student")}><Text style={s.roleActionText}>{changingRoleId === user.id ? "Updating…" : "Make Student"}</Text></Pressable><Pressable disabled={changingRoleId === user.id || user.role === "teacher"} style={[s.roleAction, user.role === "teacher" && s.actionDisabled]} onPress={() => void changeRole(user, "teacher")}><Text style={s.roleActionText}>{changingRoleId === user.id ? "Updating…" : "Make Teacher"}</Text></Pressable></View>}
              {user.id === currentUserId && <Text style={s.muted}>Your current administrator account</Text>}
              {user.role === "admin" && user.id !== currentUserId && <Text style={s.muted}>Admin role changes are managed directly in Supabase for safety.</Text>}
            </View>)}
            {!users.length && <Empty text="No user profiles were found." />}
          </>}

          {tab === "events" && <>
            <Text style={s.sectionTitle}>All Events ({events.length})</Text>
            {events.map((event) => <View key={event.id} style={s.card}><Text style={s.cardTitle}>{event.title}</Text><Text style={s.code}>Code: {event.event_code}</Text><Text style={s.muted}>Created by: {userById.get(event.created_by || "")?.full_name || userById.get(event.created_by || "")?.email || "Unknown user"}</Text><Text style={s.muted}>Created: {new Date(event.created_at).toLocaleString()}</Text>{event.start_time && <Text style={s.muted}>Starts: {new Date(event.start_time).toLocaleString()}</Text>}{event.end_time && <Text style={s.muted}>Ends: {new Date(event.end_time).toLocaleString()}</Text>}<Text style={s.muted}>{attendance.filter((row) => row.event_id === event.id).length} attendance record(s)</Text></View>)}
            {!events.length && <Empty text="No events have been created yet." />}
          </>}

          {tab === "attendance" && <>
            <Text style={s.sectionTitle}>All Attendance ({attendance.length})</Text>
            {attendance.map((row) => { const user = userById.get(row.student_id); const event = eventById.get(row.event_id); return <View key={row.id} style={s.card}><Text style={s.cardTitle}>{event?.title || "Unknown event"}</Text><Text style={s.cardSub}>{user?.full_name || user?.email || "Unknown student"}</Text><Text style={s.code}>{event?.event_code || "No event code"}</Text><Text style={s.muted}>Scanned: {new Date(row.scanned_at).toLocaleString()}</Text></View>; })}
            {!attendance.length && <Empty text="No attendance has been recorded yet." />}
          </>}
        </>}
      </ScrollView>
      <BottomNav role="admin" />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;
}
function Empty({ text }: { text: string }) { return <Text style={s.empty}>{text}</Text>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 22, paddingTop: 60, paddingBottom: 125 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badge: { color: COLORS.secondary, fontWeight: "900", letterSpacing: 1.3, fontSize: 11 },
  title: { color: COLORS.text, fontSize: 27, fontWeight: "900", marginTop: 9 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  logout: { color: COLORS.danger, fontWeight: "900", paddingTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 14 },
  statValue: { color: COLORS.text, fontSize: 24, fontWeight: "900" },
  statLabel: { color: COLORS.muted, fontWeight: "700", marginTop: 4, fontSize: 12 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 23, marginBottom: 20, backgroundColor: COLORS.surface, borderRadius: 13, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontWeight: "800", fontSize: 12 },
  activeTabText: { color: "#fff" },
  sectionTitle: { color: COLORS.text, fontSize: 19, fontWeight: "900", marginBottom: 12 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 16, marginBottom: 11 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  cardSub: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  muted: { color: COLORS.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  code: { color: COLORS.secondary, fontWeight: "800", marginTop: 6 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  adminBadge: { borderColor: COLORS.secondary },
  roleBadgeText: { color: COLORS.secondary, fontSize: 10, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  roleAction: { flex: 1, borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 10, padding: 10, alignItems: "center" },
  actionDisabled: { opacity: 0.4 },
  roleActionText: { color: COLORS.secondary, fontWeight: "800", fontSize: 11 },
  notice: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 15, padding: 16 },
  errorTitle: { color: COLORS.danger, fontWeight: "900", fontSize: 16 },
  noticeText: { color: COLORS.muted, marginTop: 8, lineHeight: 20 },
  smallButton: { marginTop: 14, alignSelf: "flex-start", backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10 },
  smallButtonText: { color: "#fff", fontWeight: "800" },
  empty: { color: COLORS.muted, textAlign: "center", paddingVertical: 35, lineHeight: 22 },
});
