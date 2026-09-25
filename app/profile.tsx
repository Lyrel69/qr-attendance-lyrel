import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";

export default function Profile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");
    setEmail(data.user.email || "");
    setUserId(data.user.id);
    const r = data.user.user_metadata?.role === "teacher" ? "teacher" : "student";
    setRole(r);
    const { data: p } = await supabase.from("profiles").select("full_name,student_id,role").eq("id", data.user.id).maybeSingle();
    setName(p?.full_name || data.user.user_metadata?.full_name || "");
    setStudentId(p?.student_id || data.user.user_metadata?.student_id || "");
  }

  useEffect(() => { load(); }, []);

  async function saveName() {
    if (!name.trim()) return Alert.alert("Missing name", "Enter your name.");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), updated_at: new Date().toISOString() }).eq("id", userId);
    if (!error) await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    if (error) return Alert.alert("Could not save", error.message);
    setEditing(false);
    Alert.alert("Profile updated", "Your name was saved.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <View style={s.root}>
      <View style={s.c}>
        <View style={s.header}><Pressable onPress={() => router.replace("/home")}><Ionicons name="arrow-back" size={28} color={COLORS.text} /></Pressable><Text style={s.headerTitle}>Profile</Text><Ionicons name="settings-outline" size={27} color={COLORS.text} /></View>
        <View style={s.avatar}><Ionicons name="person" size={52} color={COLORS.primary} /></View>
        {editing ? <TextInput value={name} onChangeText={setName} style={s.nameInput} autoCapitalize="words" /> : <Text style={s.name}>{name || "User"}</Text>}
        <View style={s.badge}><Text style={s.badgeText}>{role === "teacher" ? "Teacher" : "Student"}</Text></View>
        <View style={s.card}>
          <View style={s.infoRow}><Ionicons name="mail-outline" size={26} color={COLORS.muted} /><View style={{flex:1}}><Text style={s.infoLabel}>Email</Text><Text style={s.infoValue}>{email}</Text></View></View>
          {role === "student" && <View style={s.infoRow}><Ionicons name="school-outline" size={26} color={COLORS.muted} /><View style={{flex:1}}><Text style={s.infoLabel}>Student ID</Text><Text style={s.infoValue}>{studentId || "—"}</Text></View></View>}
          <View style={s.infoRow}><Ionicons name="person-outline" size={26} color={COLORS.muted} /><View style={{flex:1}}><Text style={s.infoLabel}>User ID</Text><Text style={s.infoValueSmall}>{userId}</Text></View></View>
          {editing ? <Pressable style={s.saveButton} onPress={saveName} disabled={saving}><Text style={s.saveText}>{saving ? "Saving..." : "Save Name"}</Text></Pressable> : <Pressable style={s.editButton} onPress={() => setEditing(true)}><Ionicons name="create-outline" size={22} color={COLORS.secondary}/><Text style={s.editText}>Edit Name</Text></Pressable>}
        </View>
        <Pressable style={s.signOut} onPress={signOut}><Ionicons name="log-out-outline" size={24} color={COLORS.danger}/><Text style={s.signText}>Sign Out</Text></Pressable>
      </View>
      <BottomNav role={role} />
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},c:{flex:1,padding:24,paddingTop:58},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},headerTitle:{color:COLORS.text,fontSize:21,fontWeight:"900"},avatar:{width:110,height:110,borderRadius:55,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:28},name:{color:COLORS.text,fontSize:27,fontWeight:"900",textAlign:"center",marginTop:20},nameInput:{color:COLORS.text,fontSize:23,fontWeight:"800",textAlign:"center",borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:10,marginTop:20},badge:{alignSelf:"center",backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:20,paddingHorizontal:18,paddingVertical:8,marginTop:10},badgeText:{color:COLORS.secondary,fontWeight:"900"},card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:20,padding:20,marginTop:24},infoRow:{flexDirection:"row",gap:14,marginBottom:18},infoLabel:{color:COLORS.muted,fontWeight:"700",fontSize:12},infoValue:{color:COLORS.text,fontSize:16,marginTop:4},infoValueSmall:{color:COLORS.muted,fontSize:12,marginTop:4},editButton:{borderWidth:1,borderColor:COLORS.secondary,borderRadius:13,padding:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},editText:{color:COLORS.secondary,fontWeight:"900",fontSize:16},saveButton:{backgroundColor:COLORS.primary,borderRadius:13,padding:14,alignItems:"center"},saveText:{color:"#fff",fontWeight:"900"},signOut:{marginTop:16,borderRadius:15,padding:17,backgroundColor:COLORS.surface,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:10},signText:{color:COLORS.danger,fontWeight:"900",fontSize:16}
});
