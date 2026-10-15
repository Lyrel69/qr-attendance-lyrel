import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { registerAttendance } from "../lib/attendance";
import { getCurrentRole, type Role } from "../lib/profiles";
import { COLORS } from "../constants/colors";
import { BottomNav } from "../components/BottomNav";

export default function Scan() {
  const [perm, ask] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      const currentRole = await getCurrentRole(data.user.id);
      setRole(currentRole);
      setCheckingUser(false);
    })();
  }, []);

  async function scan({ data }: { data: string }) {
    if (locked || checkingUser) return;
    setLocked(true);
    try {
      const { data: authData, error } = await supabase.auth.getUser();
      if (error || !authData.user) throw new Error("Please sign in again.");
      const currentRole = await getCurrentRole(authData.user.id);
      setRole(currentRole);
      if (currentRole !== "student") throw new Error("Only student accounts can record attendance.");

      const result = await registerAttendance(data, authData.user.id);
      if (!result.success) throw new Error(result.message);
      Alert.alert(
        "Attendance recorded",
        `${result.eventTitle}\nScanned: ${new Date().toLocaleString()}`,
        [{ text: "OK", onPress: () => router.replace("/history") }]
      );
    } catch (error: any) {
      Alert.alert("Scan failed", error?.message || "Unable to record attendance.", [
        { text: "Try Again", onPress: () => setLocked(false) },
        { text: "Back", onPress: () => router.replace("/home") },
      ]);
    }
  }

  if (checkingUser || !perm) {
    return <View style={s.center}><ActivityIndicator color={COLORS.secondary} /><Text style={s.text}>Checking account and camera permission...</Text></View>;
  }

  if (role !== "student") {
    return <View style={s.center}><Ionicons name="shield-checkmark-outline" size={48} color={COLORS.secondary} /><Text style={s.title}>Student Scan Only</Text><Text style={s.text}>Teacher accounts can create events and review attendance. Sign in with a student account to record attendance.</Text><Pressable style={s.btn} onPress={() => router.replace("/teacher")}><Text style={s.btnText}>Go to Teacher Home</Text></Pressable><BottomNav role={role} /></View>;
  }

  if (!perm.granted) {
    return <View style={s.center}><Text style={s.title}>Camera Permission</Text><Text style={s.text}>Camera access is needed to scan attendance QR codes.</Text><Pressable style={s.btn} onPress={ask}><Text style={s.btnText}>Allow Camera</Text></Pressable><BottomNav role={role} /></View>;
  }

  return (
    <View style={s.root}>
      <CameraView style={s.cam} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={locked ? undefined : scan} />
      <View style={s.overlay}>
        <Pressable onPress={() => router.replace("/home")}><Text style={s.back}>‹ Back</Text></Pressable>
        <View style={s.scanBox}><Ionicons name="scan-outline" size={70} color="#fff" /></View>
        <Text style={s.title}>Scan Attendance QR</Text>
        <Text style={s.text}>{locked ? "Processing scan..." : "Point the camera at your teacher's event QR code."}</Text>
      </View>
      <BottomNav role={role} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  cam: { flex: 1 },
  overlay: { position: "absolute", left: 20, right: 20, bottom: 85, backgroundColor: "rgba(8,10,22,.92)", padding: 20, borderRadius: 18, alignItems: "center" },
  back: { color: COLORS.secondary, fontWeight: "800", alignSelf: "flex-start", marginBottom: 10 },
  scanBox: { width: 150, height: 150, borderWidth: 2, borderColor: "#fff", borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  text: { color: "#D8DCF0", lineHeight: 22, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: COLORS.background, gap: 15 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 15 },
  btnText: { color: "#fff", fontWeight: "800" },
});
