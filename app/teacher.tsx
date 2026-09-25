import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";

type Event = { id: string; title: string; event_code: string; created_at: string; start_time: string | null; end_time: string | null };

export default function TeacherHome() {
  const [name, setName] = useState("Teacher");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");
    const role = u.user.user_metadata?.role;
    if (role !== "teacher") return router.replace("/home");
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
    if (profile?.full_name) setName(profile.full_name);
    const { data } = await supabase.from("events").select("id,title,event_code,created_at,start_time,end_time").eq("created_by", u.user.id).order("created_at", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <View style={s.c}>
      <View style={s.header}><View><Text style={s.badge}>TEACHER • LYREL</Text><Text style={s.t}>Hello, {name} 👋</Text></View><Pressable onPress={logout}><Text style={s.logout}>Logout</Text></Pressable></View>
      <Text style={s.sub}>Create a class event and show its QR code.</Text>
      <Pressable style={s.primary} onPress={() => router.push("/create-event")}><Text style={s.primaryText}>＋ Create Event</Text></Pressable>
      <Text style={s.section}>Your Events</Text>
      <FlatList data={events} refreshing={loading} onRefresh={load} contentContainerStyle={{ paddingBottom: 120 }} keyExtractor={(x) => x.id} ListEmptyComponent={<Text style={s.empty}>No events yet. Create your first attendance event.</Text>} renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => router.push({ pathname: "/create-event", params: { eventId: item.id } })}>
          <View style={{ flex: 1 }}><Text style={s.title}>{item.title}</Text><Text style={s.code}>Code: {item.event_code}</Text><Text style={s.time}>Created: {new Date(item.created_at).toLocaleString()}</Text>{item.start_time && <Text style={s.time}>Starts: {new Date(item.start_time).toLocaleString()}</Text>}{item.end_time && <Text style={s.time}>Ends: {new Date(item.end_time).toLocaleString()}</Text>}</View><Text style={s.arrow}>›</Text>
        </Pressable>
      )} />
      <BottomNav role="teacher" />
    </View>
  );
}

const s = StyleSheet.create({ c:{flex:1,backgroundColor:COLORS.background,padding:24,paddingTop:62},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"},badge:{color:COLORS.secondary,fontWeight:"800",letterSpacing:1.5},t:{color:COLORS.text,fontSize:29,fontWeight:"800",marginTop:10},sub:{color:COLORS.muted,fontSize:15,lineHeight:22,marginTop:6,marginBottom:18},logout:{color:COLORS.danger,fontWeight:"800",paddingTop:4},primary:{backgroundColor:COLORS.primary,borderRadius:15,padding:17,alignItems:"center"},primaryText:{color:"#fff",fontSize:16,fontWeight:"800"},section:{color:COLORS.text,fontSize:20,fontWeight:"800",marginTop:25,marginBottom:12},card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:15,padding:17,marginBottom:11,flexDirection:"row",alignItems:"center"},title:{color:COLORS.text,fontSize:17,fontWeight:"800"},code:{color:COLORS.secondary,fontWeight:"700",marginTop:5},time:{color:COLORS.muted,fontSize:12,marginTop:4},arrow:{color:COLORS.muted,fontSize:30},empty:{color:COLORS.muted,textAlign:"center",marginTop:40,lineHeight:22} });
