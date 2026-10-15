import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCurrentRole } from "../lib/profiles";
import { COLORS } from "../constants/colors";

type Role = "student" | "teacher" | "admin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Enter email and password.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      Alert.alert("Login failed", error?.message ?? "Unable to sign in.");
      return;
    }

    const accountRole = await getCurrentRole(data.user.id);
    setLoading(false);
    if (accountRole !== role) {
      await supabase.auth.signOut();
      return Alert.alert("Wrong account type", `This account is registered as a ${accountRole}.`);
    }
    router.replace(accountRole === "admin" ? "/admin" : accountRole === "teacher" ? "/teacher" : "/home");
  }

  return (
    <View style={s.c}>
      <Text style={s.logo}>LYREL</Text>
      <Text style={s.t}>QR Attendance</Text>
      <Text style={s.sub}>Sign in to continue</Text>
      <Text style={s.label}>Sign in as</Text>
      <View style={s.row}>
        {(["student", "teacher", "admin"] as Role[]).map((item) => (
          <Pressable key={item} style={[s.role, item === role && s.active]} onPress={() => setRole(item)}>
            <Text style={[s.roleText, item === role && s.white]}>{item === "student" ? "🎓 Student" : item === "teacher" ? "👨‍🏫 Teacher" : "🛡️ Admin"}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={s.i} placeholder="Email" placeholderTextColor={COLORS.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      <TextInput style={s.i} placeholder="Password" placeholderTextColor={COLORS.muted} secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
      <Pressable style={[s.b, loading && s.disabled]} onPress={login} disabled={loading}><Text style={s.bt}>{loading ? "Signing in..." : `Sign In as ${role === "student" ? "Student" : role === "teacher" ? "Teacher" : "Admin"}`}</Text></Pressable>
      <Pressable onPress={() => router.push("/register")}><Text style={s.link}>Create an account</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: COLORS.background },
  logo: { color: COLORS.secondary, fontWeight: "800", letterSpacing: 3 },
  t: { color: COLORS.text, fontSize: 34, fontWeight: "800", marginTop: 8 },
  sub: { color: COLORS.muted, fontSize: 16, marginBottom: 20, marginTop: 5 },
  label: { color: COLORS.text, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  role: { flex: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  active: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { color: COLORS.muted, fontWeight: "800" },
  white: { color: "#fff" },
  i: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, color: COLORS.text, padding: 16, marginBottom: 12 },
  b: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  disabled: { opacity: .65 },
  bt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  link: { color: COLORS.secondary, textAlign: "center", marginTop: 22, fontWeight: "700" },
});
