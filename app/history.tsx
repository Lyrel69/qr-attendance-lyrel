import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";

type EventHistory = { id:string; title:string; event_code:string; created_at:string; start_time:string|null; end_time:string|null; attendees:{id:string; name:string; studentId:string; scanned_at:string}[] };
type StudentHistory = { id:string; scanned_at:string; event?:{title:string;event_code:string;start_time:string|null;end_time:string|null} };

function fmt(value:string){return new Date(value).toLocaleString([], {month:"numeric",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});}

export default function History(){
  const [role,setRole]=useState<"student"|"teacher">("student");
  const [teacherRows,setTeacherRows]=useState<EventHistory[]>([]);
  const [studentRows,setStudentRows]=useState<StudentHistory[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    const {data:u}=await supabase.auth.getUser();
    if(!u.user){router.replace("/login");return;}
    const r=u.user.user_metadata?.role==="teacher"?"teacher":"student";
    setRole(r);
    if(r==="teacher"){
      const {data:events,error}=await supabase.from("events").select("id,title,event_code,created_at,start_time,end_time").eq("created_by",u.user.id).order("created_at",{ascending:false});
      if(error){setTeacherRows([]);setLoading(false);return;}
      const eventIds=(events||[]).map((e:any)=>e.id);
      let attendees:any[]=[];
      if(eventIds.length){const {data:a}=await supabase.from("attendance").select("id,event_id,student_id,scanned_at").in("event_id",eventIds).order("scanned_at",{ascending:false});attendees=a||[];}
      const ids=[...new Set(attendees.map(a=>a.student_id))];
      let profiles:any[]=[];
      if(ids.length){const {data:p}=await supabase.from("profiles").select("id,full_name,student_id").in("id",ids);profiles=p||[];}
      setTeacherRows((events||[]).map((e:any)=>({id:e.id,title:e.title,event_code:e.event_code,created_at:e.created_at,start_time:e.start_time,end_time:e.end_time,attendees:attendees.filter(a=>a.event_id===e.id).map(a=>{const p=profiles.find(x=>x.id===a.student_id);return{id:a.id,name:p?.full_name||"Student",studentId:p?.student_id||"—",scanned_at:a.scanned_at};})})));
    }else{
      const {data}=await supabase.from("attendance").select("id,scanned_at,event_id").eq("student_id",u.user.id).order("scanned_at",{ascending:false});
      const ids=(data||[]).map((x:any)=>x.event_id);let ev:any[]=[];if(ids.length){const {data:e}=await supabase.from("events").select("id,title,event_code,start_time,end_time").in("id",ids);ev=e||[];}
      setStudentRows((data||[]).map((x:any)=>({...x,event:ev.find(e=>e.id===x.event_id)})));
    }
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  async function refresh(){setRefreshing(true);await load();setRefreshing(false);}

  return <View style={s.root}><View style={s.c}><Text style={s.t}>Attendance History</Text><Text style={s.sub}>{role==="teacher"?"Events you created and the students who attended.":"Your recorded attendance."}</Text>
    {loading?<ActivityIndicator color={COLORS.secondary} style={{marginTop:40}}/>:role==="teacher"?<FlatList data={teacherRows} keyExtractor={x=>x.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.secondary}/>} contentContainerStyle={{paddingBottom:130}} ListEmptyComponent={<Text style={s.empty}>No events created yet.</Text>} renderItem={({item})=><View style={s.card}><View style={s.titleRow}><View style={s.iconCircle}><Ionicons name="people-outline" size={25} color={COLORS.secondary}/></View><View style={{flex:1}}><Text style={s.et}>{item.title}</Text><Text style={s.created}>{fmt(item.created_at)}</Text><Text style={s.att}>Attendees: {item.attendees.length}</Text></View></View><View style={s.line}/>{item.start_time&&<Text style={s.timeInfo}>Starts: {fmt(item.start_time)}</Text>}{item.end_time&&<Text style={s.timeInfo}>Ends: {fmt(item.end_time)}</Text>}<Text style={s.present}>Present Students</Text>{item.attendees.length?item.attendees.map(a=><View key={a.id} style={s.studentRow}><Ionicons name="checkmark-circle" size={21} color={COLORS.success}/><View><Text style={s.student}>{a.name}</Text><Text style={s.studentId}>{a.studentId} • {new Date(a.scanned_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</Text></View></View>):<Text style={s.none}>No students have registered attendance yet.</Text>}</View>}/>:<FlatList data={studentRows} keyExtractor={x=>x.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.secondary}/>} contentContainerStyle={{paddingBottom:130}} ListEmptyComponent={<Text style={s.empty}>No attendance records yet.</Text>} renderItem={({item})=><View style={s.card}><Text style={s.et}>{item.event?.title||"Attendance Event"}</Text><Text style={s.code}>{item.event?.event_code||""}</Text><Text style={s.created}>Scanned: {fmt(item.scanned_at)}</Text>{item.event?.start_time&&<Text style={s.timeInfo}>Event: {fmt(item.event.start_time)} – {item.event.end_time?fmt(item.event.end_time):""}</Text>}</View>}/>}</View><BottomNav role={role}/></View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.background},c:{flex:1,padding:24,paddingTop:58},t:{color:COLORS.text,fontSize:30,fontWeight:"900"},sub:{color:COLORS.muted,marginTop:5,marginBottom:20},card:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:18,padding:18,marginBottom:14},titleRow:{flexDirection:"row",gap:14,alignItems:"center"},iconCircle:{width:58,height:58,borderRadius:29,backgroundColor:COLORS.surface,alignItems:"center",justifyContent:"center"},et:{color:COLORS.text,fontSize:18,fontWeight:"900"},created:{color:COLORS.muted,marginTop:5},att:{color:COLORS.success,fontWeight:"900",marginTop:7},line:{height:1,backgroundColor:COLORS.border,marginVertical:15},present:{color:COLORS.text,fontSize:17,fontWeight:"900",marginBottom:10},studentRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:9},student:{color:COLORS.text,fontSize:15,fontWeight:"700"},studentId:{color:COLORS.muted,fontSize:12,marginTop:2},none:{color:COLORS.muted,fontStyle:"italic"},code:{color:COLORS.secondary,fontWeight:"900",marginTop:4},timeInfo:{color:COLORS.muted,fontSize:12,marginTop:7},empty:{color:COLORS.muted,textAlign:"center",marginTop:40}}
);
