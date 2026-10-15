import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { COLORS } from "../constants/colors";

type Role = "student" | "teacher";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  async function reg() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing information", "Complete all required fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Check both password fields.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim(), role } },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Registration failed", error.message);
      return;
    }

    if (!data.session) {
      Alert.alert("Account created", "If email confirmation is enabled, check your inbox before signing in.");
      router.replace("/login");
      return;
    }

    Alert.alert("Account created", `Your ${role} account is ready.`);
    router.replace(role === "teacher" ? "/teacher" : "/home");
  }

  return (
    <View style={s.c}>
      <Text style={s.t}>Create Account</Text>
      <Text style={s.sub}>Choose your account type</Text>
      <View style={s.roleRow}>
        {(["student", "teacher"] as Role[]).map((item) => (
          <Pressable key={item} style={[s.roleButton, role === item && s.roleButtonActive]} onPress={() => setRole(item)}>
            <Text style={[s.roleIcon, role === item && s.roleTextActive]}>{item === "student" ? "🎓" : "👨‍🏫"}</Text>
            <Text style={[s.roleText, role === item && s.roleTextActive]}>{item === "student" ? "Student" : "Teacher"}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={s.i} placeholder="Full name" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} autoCapitalize="words" />
      <TextInput style={s.i} placeholder="Email" placeholderTextColor={COLORS.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput style={s.i} placeholder="Password (at least 6 characters)" placeholderTextColor={COLORS.muted} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <TextInput style={s.i} placeholder="Confirm password" placeholderTextColor={COLORS.muted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />

      <Pressable style={[s.b, loading && s.disabled]} onPress={reg} disabled={loading}>
        <Text style={s.bt}>{loading ? "Creating..." : `Create ${role === "student" ? "Student" : "Teacher"} Account`}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/login")}><Text style={s.link}>Back to sign in</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: COLORS.background },
  t: { color: COLORS.text, fontSize: 30, fontWeight: "800" },
  sub: { color: COLORS.muted, marginBottom: 18, marginTop: 5 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  roleButton: { flex: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  roleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleIcon: { fontSize: 20, marginBottom: 3 },
  roleText: { color: COLORS.muted, fontWeight: "800" },
  roleTextActive: { color: "#fff" },
  i: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, color: COLORS.text, padding: 16, marginBottom: 12 },
  b: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: "center" },
  disabled: { opacity: 0.65 },
  bt: { color: "#fff", fontWeight: "800" },
  link: { color: COLORS.secondary, textAlign: "center", marginTop: 20, fontWeight: "700" },
});
