import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { makeEventCode } from "../lib/helpers";
import { getCurrentRole } from "../lib/profiles";
import { createEvent as saveCloudEvent } from "../lib/events";
import { buildQRPayload } from "../lib/qr";
import { BottomNav } from "../components/BottomNav";

function formatDateTime(value: Date) {
  return value.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function DateTimeButton({ label, value, onPress, icon }: { label: string; value: Date; onPress: () => void; icon: "sunny-outline" | "moon-outline" }) {
  return (
    <Pressable style={s.dateButton} onPress={onPress}>
      <Ionicons name={icon} size={26} color={COLORS.secondary} />
      <View style={{ flex: 1 }}>
        <Text style={s.dateLabel}>{label}</Text>
        <Text style={s.dateValue}>{formatDateTime(value)}</Text>
      </View>
      <Ionicons name="calendar-outline" size={25} color={COLORS.muted} />
    </Pressable>
  );
}

export default function CreateEvent() {
  const { eventId: rawEventId } = useLocalSearchParams<{ eventId?: string }>();
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(makeEventCode());
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [savedQRTitle, setSavedQRTitle] = useState("");
  const [savedQRCode, setSavedQRCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<"start-date" | "start-time" | "end-date" | "end-time" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");
      const role = await getCurrentRole(u.user.id);
      if (role !== "teacher") return router.replace("/home");
      if (!eventId) return;
      const { data, error } = await supabase
        .from("events")
        .select("id,title,event_code,start_time,end_time,created_at")
        .eq("id", eventId)
        .eq("created_by", u.user.id)
        .maybeSingle();
      if (error) return Alert.alert("Could not load event", error.message);
      if (data) {
        setTitle(data.title || "");
        setCode(data.event_code || makeEventCode());
        if (data.start_time) setStart(new Date(data.start_time));
        if (data.end_time) setEnd(new Date(data.end_time));
        if (data.created_at) setCreatedAt(new Date(data.created_at));
        setSavedId(data.id);
        setQrPayload(buildQRPayload({
          eventId: data.event_code,
          title: data.title,
          start: data.start_time,
          end: data.end_time,
        }));
        setSavedQRTitle(data.title);
        setSavedQRCode(data.event_code);
      }
    })();
  }, [eventId]);

  function changeStart(next: Date) {
    setStart(next);
    if (end <= next) setEnd(new Date(next.getTime() + 60 * 60 * 1000));
  }

  function changeEnd(next: Date) {
    setEnd(next);
  }

  function applyQuickEnd(minutes: number) {
    setEnd(new Date(start.getTime() + minutes * 60 * 1000));
  }

  async function save() {
    if (!title.trim()) return Alert.alert("Missing title", "Enter the event or class name.");
    if (!code.trim()) return Alert.alert("Missing event code", "Enter an event code or use the generated one.");
    if (end <= start) return Alert.alert("Invalid time", "End time must be after the start time.");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Please sign in again.");
      const cleanCode = code.trim().toUpperCase();
      const duplicate = await supabase.from("events").select("id").eq("event_code", cleanCode).neq("id", savedId || "00000000-0000-0000-0000-000000000000").maybeSingle();
      if (duplicate.error) throw duplicate.error;
      if (duplicate.data) throw new Error("That event code is already in use. Choose another code.");

      const result = await saveCloudEvent({
        eventId: savedId ?? undefined,
        title: title.trim(),
        eventCode: cleanCode,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      if (result.error || !result.event) throw new Error(result.error || "Could not save the event.");

      setCode(result.event.event_code);
      setCreatedAt(new Date(result.event.created_at));
      setSavedId(result.event.id);
      setQrPayload(buildQRPayload({
        eventId: result.event.event_code,
        title: result.event.title,
        start: result.event.start_time,
        end: result.event.end_time,
      }));
      setSavedQRTitle(result.event.title);
      setSavedQRCode(result.event.event_code);
      Alert.alert(savedId ? "Event updated" : "Event created", "The QR code and event times are saved.");
    } catch (e: any) {
      Alert.alert("Could not save event", e?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  }

  function pickerValue() {
    if (picker === "start-date" || picker === "start-time") return start;
    return end;
  }

  function onPickerValueChange(event: any, selected?: Date) {
    if (!selected || !picker) return;

    if (picker.startsWith("start")) {
      const next = new Date(start);
      if (picker.endsWith("date")) {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      changeStart(next);
    } else {
      const next = new Date(end);
      if (picker.endsWith("date")) {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      changeEnd(next);
    }
    setPicker(null);
  }

  function onPickerDismiss() {
    setPicker(null);
  }


  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.c}>
        <Pressable onPress={() => router.replace("/teacher")}><Text style={s.back}>‹ Teacher Home</Text></Pressable>
        <Text style={s.t}>{savedId ? "Event Details" : "Create Event"}</Text>
        <Text style={s.sub}>Fill in the event details, then generate a QR code for attendance.</Text>

        <View style={s.card}>
          <Text style={s.label}>Event Title</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Founders Day Assembly" placeholderTextColor={COLORS.muted} style={s.input} />

          <Text style={s.label}>Event Code</Text>
          <TextInput value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="e.g. EVT-2026-0002" placeholderTextColor={COLORS.muted} style={s.input} maxLength={20} />

          <Text style={s.label}>Starts</Text>
          <DateTimeButton label="Start date & time" value={start} onPress={() => setPicker("start-date")} icon="sunny-outline" />
          <View style={s.smallRow}>
            <Pressable style={s.smallButton} onPress={() => setPicker("start-time")}><Text style={s.smallText}>Change time</Text></Pressable>
            <Pressable style={s.smallButton} onPress={() => setPicker("start-date")}><Text style={s.smallText}>Change date</Text></Pressable>
          </View>

          <Text style={s.label}>Ends</Text>
          <DateTimeButton label="End date & time" value={end} onPress={() => setPicker("end-date")} icon="moon-outline" />
          <View style={s.smallRow}>
            <Pressable style={s.smallButton} onPress={() => setPicker("end-time")}><Text style={s.smallText}>Change time</Text></Pressable>
            <Pressable style={s.smallButton} onPress={() => setPicker("end-date")}><Text style={s.smallText}>Change date</Text></Pressable>
          </View>
          <View style={s.quickRow}>
            <Pressable style={s.chip} onPress={() => applyQuickEnd(30)}><Text style={s.chipText}>+30 min</Text></Pressable>
            <Pressable style={s.chip} onPress={() => applyQuickEnd(60)}><Text style={s.chipText}>+1 hour</Text></Pressable>
            <Pressable style={s.chip} onPress={() => applyQuickEnd(120)}><Text style={s.chipText}>+2 hours</Text></Pressable>
          </View>
          <Text style={s.help}>Tap a chip to set the end time from the start.</Text>

          {createdAt && <Text style={s.created}>Created: {formatDateTime(createdAt)}</Text>}

          {!savedId && <Pressable style={[s.primary, loading && { opacity: .6 }]} onPress={save} disabled={loading}><Text style={s.primaryText}>{loading ? "Creating..." : "＋  Create Event"}</Text></Pressable>}
          {savedId && qrPayload && <>
            <Pressable style={[s.primary, loading && { opacity: .6 }]} onPress={save} disabled={loading}><Text style={s.primaryText}>{loading ? "Saving..." : "Save Event Changes"}</Text></Pressable>
            <View style={s.qrCard}><QRCode value={qrPayload} size={230} backgroundColor="#FFFFFF" color="#000000"/><Text style={s.qrTitle}>{savedQRTitle}</Text><Text style={s.qrHint}>Students scan this saved QR code to record attendance. Save any changes above to update it.</Text><Text style={s.code}>{savedQRCode}</Text></View>
            <Pressable style={s.secondary} onPress={() => router.push({ pathname: "/teacher-attendance", params: { eventId: savedId } })}><Text style={s.secondaryText}>View Attendance</Text></Pressable>
          </>}
        </View>
      </ScrollView>
      <BottomNav role="teacher" />

      {picker && (
        <DateTimePicker
          value={pickerValue()}
          mode={picker.endsWith("date") ? "date" : "time"}
          display="default"
          is24Hour={false}
          onChange={onPickerValueChange}
          onDismiss={onPickerDismiss}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  c: { padding: 24, paddingTop: 58, paddingBottom: 150 },
  back: { color: COLORS.secondary, fontWeight: "800", marginBottom: 16 },
  t: { color: COLORS.text, fontSize: 30, fontWeight: "800" },
  sub: { color: COLORS.muted, lineHeight: 22, marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 18 },
  label: { color: COLORS.text, fontWeight: "800", marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, color: COLORS.text, padding: 16, marginBottom: 8 },
  dateButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  dateLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  dateValue: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 2 },
  smallRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 8 },
  smallButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: "center", backgroundColor: COLORS.surface },
  smallText: { color: COLORS.secondary, fontWeight: "800", fontSize: 12 },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  chipText: { color: COLORS.success, fontWeight: "900" },
  help: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  created: { color: COLORS.muted, marginTop: 18, fontWeight: "700" },
  primary: { backgroundColor: COLORS.primary, padding: 17, borderRadius: 14, alignItems: "center", marginTop: 18 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  qrCard: { backgroundColor: "#fff", borderRadius: 20, alignItems: "center", padding: 24, marginTop: 18 },
  qrTitle: { color: "#111", fontWeight: "800", fontSize: 20, marginTop: 16, textAlign: "center" },
  qrHint: { color: "#555", textAlign: "center", marginTop: 6 },
  code: { color: COLORS.primary, fontWeight: "900", fontSize: 26, letterSpacing: 4, marginTop: 14 },
  secondary: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 12, backgroundColor: COLORS.surface },
  secondaryText: { color: COLORS.text, fontWeight: "800" },
});
