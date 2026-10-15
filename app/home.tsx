import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";
import { BottomNav } from "../components/BottomNav";
import { getCurrentRole } from "../lib/profiles";

export default function Home(){
  const [name,setName]=useState("User");const [role,setRole]=useState<"student"|"teacher"|"admin">("student");
  useEffect(()=>{(async()=>{const {data}=await supabase.auth.getUser();if(!data.user)return router.replace("/login");const r=await getCurrentRole(data.user.id);setRole(r);const {data:p}=await supabase.from("profiles").select("full_name").eq("id",data.user.id).maybeSingle();if(p?.full_name)setName(p.full_name);else if(data.user.user_metadata?.full_name)setName(data.user.user_metadata.full_name);})();},[]);
  return <View style={s.c}><View style={s.brand}><View style={s.logo}><Ionicons name="school-outline" size={48} color={COLORS.primary}/></View><Text style={s.brandText}>QR ATTENDANCE</Text><Text style={s.by}>By: {name}</Text></View><Text style={s.t}>Welcome!</Text><Text style={s.sub}>Manage your school attendance quickly and easily.</Text><Pressable style={s.primary} onPress={()=>router.replace("/scan")}><Ionicons name="qr-code-outline" size={28} color="#fff"/><Text style={s.primaryText}>Scan QR Code</Text></Pressable><Pressable style={s.card} onPress={()=>router.replace("/history")}><Ionicons name="time-outline" size={30} color={COLORS.secondary}/><Text style={s.cardText}>Attendance History</Text></Pressable><Pressable style={s.card} onPress={()=>router.replace("/profile")}><Ionicons name="person-outline" size={30} color={COLORS.muted}/><Text style={s.cardText}>Profile</Text></Pressable>{role==="teacher"&&<Text style={s.teacherHint}>Teacher tools are available in the Teacher tab.</Text>}<BottomNav role={role}/></View>
}
const s=StyleSheet.create({c:{flex:1,padding:24,paddingTop:58,backgroundColor:COLORS.background},brand:{alignItems:"center",marginBottom:30},logo:{width:105,height:105,borderRadius:53,backgroundColor:COLORS.surface,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:COLORS.border},brandText:{color:COLORS.text,fontSize:24,fontWeight:"900",marginTop:16,letterSpacing:1},by:{color:COLORS.muted,fontWeight:"700",marginTop:8},t:{color:COLORS.text,fontSize:30,fontWeight:"900",marginTop:8},sub:{color:COLORS.muted,fontSize:16,lineHeight:24,marginTop:8,marginBottom:26},primary:{backgroundColor:COLORS.primary,borderRadius:16,padding:20,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:12},primaryText:{color:"#fff",fontWeight:"900",fontSize:17},card:{backgroundColor:COLORS.card,borderColor:COLORS.border,borderWidth:1,borderRadius:16,padding:20,marginTop:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:14},cardText:{color:COLORS.text,fontSize:17,fontWeight:"800"},teacherHint:{color:COLORS.muted,textAlign:"center",marginTop:16,fontSize:12}}
);
