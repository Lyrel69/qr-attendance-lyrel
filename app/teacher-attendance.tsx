import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";

type Event = { id: string; title: string; event_code: string };
type Row = { id: string; student_id: string; scanned_at: string; name?: string; studentId?: string };

export default function TeacherAttendance() {
  const { eventId: rawEventId } = useLocalSearchParams<{ eventId?: string }>();
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<string | undefined>(eventId);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || u.user.user_metadata?.role !== "teacher") { router.replace("/login"); return; }
    const { data: es } = await supabase.from("events").select("id,title,event_code").eq("created_by", u.user.id).order("created_at", { ascending: false });
    setEvents(es || []);
    const chosen = selected || es?.[0]?.id;
    if (!chosen) { setRows([]); setLoading(false); return; }
    setSelected(chosen);
    const { data: attendance } = await supabase.from("attendance").select("id,student_id,scanned_at").eq("event_id", chosen).order("scanned_at", { ascending: false });
    const ids = (attendance || []).map((r: any) => r.student_id);
    let profiles: any[] = [];
    if (ids.length) { const p = await supabase.from("profiles").select("id,full_name,student_id").in("id", ids); profiles = p.data || []; }
    setRows((attendance || []).map((r: any) => { const p = profiles.find(x => x.id === r.student_id); return {...r, name:p?.full_name || "Student", studentId:p?.student_id || "—"}; }));
    setLoading(false);
  }
  useEffect(() => { load(); }, [selected]);

  return <View style={s.c}><Pressable onPress={() => router.replace("/teacher")}><Text style={s.back}>‹ Teacher Home</Text></Pressable><Text style={s.t}>Attendance</Text><Text style={s.sub}>Students who scanned the selected event.</Text>
    <Text style={s.label}>Select Event</Text>
    <View style={s.eventRow}>{events.map(e => <Pressable key={e.id} onPress={() => setSelected(e.id)} style={[s.eventPill, selected===e.id&&s.eventActive]}><Text style={[s.eventText,selected===e.id&&s.eventTextActive]}>{e.title}</Text></Pressable>)}</View>
    {loading ? <ActivityIndicator color={COLORS.secondary} style={{marginTop:30}}/> : <FlatList data={rows} keyExtractor={x=>x.id} contentContainerStyle={{paddingBottom:120}} ListEmptyComponent={<Text style={s.empty}>No students have scanned this event yet.</Text>} renderItem={({item,index})=><View style={s.card}><View style={s.num}><Text style={s.numText}>{index+1}</Text></View><View style={{flex:1}}><Text style={s.name}>{item.name}</Text><Text style={s.id}>{item.studentId}</Text></View><Text style={s.time}>{new Date(item.scanned_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</Text></View>}/>}<BottomNav role="teacher"/></View>
}
const s=StyleSheet.create({c:{flex:1,backgroundColor:COLORS.background,padding:24,paddingTop:58},back:{color:COLORS.secondary,fontWeight:"800",marginBottom:14},t:{color:COLORS.text,fontSize:30,fontWeight:"800"},sub:{color:COLORS.muted,marginTop:5,marginBottom:20},label:{color:COLORS.text,fontWeight:"800",marginBottom:8},eventRow:{flexDirection:"row",gap:8,marginBottom:18},eventPill:{maxWidth:220,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:10},eventActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},eventText:{color:COLORS.muted,fontWeight:"700"},eventTextActive:{color:"#fff"},card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:14,padding:14,marginBottom:10,flexDirection:"row",alignItems:"center",gap:12},num:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.primary,alignItems:"center",justifyContent:"center"},numText:{color:"#fff",fontWeight:"900"},name:{color:COLORS.text,fontWeight:"800",fontSize:16},id:{color:COLORS.muted,marginTop:3},time:{color:COLORS.secondary,fontWeight:"800"},empty:{color:COLORS.muted,textAlign:"center",marginTop:40,lineHeight:22}});
