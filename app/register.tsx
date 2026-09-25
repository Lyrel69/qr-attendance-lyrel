import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { COLORS } from "../constants/colors";

type Role = "student" | "teacher";

export default function Register() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("2008 2024");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  async function reg() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing information", "Complete all required fields.");
      return;
    }

    if (role === "student" && !studentId.trim()) {
      Alert.alert("Missing student ID", "Enter your student ID to continue.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          student_id: role === "student" ? studentId.trim() : "",
          role,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Registration failed", error.message);
      return;
    }

    if (!data.session) {
      Alert.alert("Account created", "Check your email if confirmation is required.");
    }

    router.replace("/login");
  }

  return (
    <View style={s.c}>
      <Text style={s.t}>Create Account</Text>
      <Text style={s.sub}>Choose your account type</Text>

      <View style={s.roleRow}>
        <Pressable
          style={[s.roleButton, role === "student" && s.roleButtonActive]}
          onPress={() => setRole("student")}
        >
          <Text style={[s.roleIcon, role === "student" && s.roleTextActive]}>🎓</Text>
          <Text style={[s.roleText, role === "student" && s.roleTextActive]}>Student</Text>
        </Pressable>

        <Pressable
          style={[s.roleButton, role === "teacher" && s.roleButtonActive]}
          onPress={() => setRole("teacher")}
        >
          <Text style={[s.roleIcon, role === "teacher" && s.roleTextActive]}>👨‍🏫</Text>
          <Text style={[s.roleText, role === "teacher" && s.roleTextActive]}>Teacher</Text>
        </Pressable>
      </View>

      <TextInput
        style={s.i}
        placeholder="Full name"
        placeholderTextColor={COLORS.muted}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {role === "student" && (
        <TextInput
          style={s.i}
          placeholder="Student ID"
          placeholderTextColor={COLORS.muted}
          value={studentId}
          onChangeText={setStudentId}
        />
      )}

      <TextInput
        style={s.i}
        placeholder="Email"
        placeholderTextColor={COLORS.muted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={s.i}
        placeholder="Password"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={[s.b, loading && s.disabled]} onPress={reg} disabled={loading}>
        <Text style={s.bt}>{loading ? "Creating..." : `Create ${role === "student" ? "Student" : "Teacher"} Account`}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: COLORS.background },
  t: { color: COLORS.text, fontSize: 30, fontWeight: "800" },
  sub: { color: COLORS.muted, marginBottom: 18, marginTop: 5 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  roleButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  roleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleIcon: { fontSize: 20, marginBottom: 3 },
  roleText: { color: COLORS.muted, fontWeight: "800" },
  roleTextActive: { color: "#fff" },
  i: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    color: COLORS.text,
    padding: 16,
    marginBottom: 12,
  },
  b: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: "center" },
  disabled: { opacity: 0.65 },
  bt: { color: "#fff", fontWeight: "800" },
  link: { color: COLORS.secondary, textAlign: "center", marginTop: 20, fontWeight: "700" },
});
