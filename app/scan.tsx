import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { COLORS } from "../constants/colors";
import { BottomNav } from "../components/BottomNav";

export default function Scan(){
  const [perm,ask]=useCameraPermissions();const[locked,setLocked]=useState(false);const[role,setRole]=useState<"student"|"teacher">("student");
  if(!perm)return <View style={s.center}><Text style={s.text}>Checking camera permission...</Text></View>;
  if(!perm.granted)return <View style={s.center}><Text style={s.title}>Camera Permission</Text><Text style={s.text}>Camera access is needed to scan QR codes.</Text><Pressable style={s.btn} onPress={ask}><Text style={s.btnText}>Allow Camera</Text></Pressable></View>;
  async function scan({data}:{data:string}){
    if(locked)return;setLocked(true);
    try{
      const{data:u}=await supabase.auth.getUser();if(!u.user)throw Error("Please sign in again.");
      const r=u.user.user_metadata?.role==="teacher"?"teacher":"student";setRole(r);if(r!=="student")throw Error("Only student accounts can record attendance.");
      const{data:event,error:ee}=await supabase.from("events").select("id,title,event_code,start_time,end_time").eq("event_code",data.trim()).maybeSingle();if(ee)throw ee;if(!event)throw Error("Attendance event not found.");
      const now=Date.now();if(event.start_time&&now<new Date(event.start_time).getTime())throw Error(`Attendance has not started yet. It starts at ${new Date(event.start_time).toLocaleString()}.`);if(event.end_time&&now>new Date(event.end_time).getTime())throw Error(`Attendance is closed. It ended at ${new Date(event.end_time).toLocaleString()}.`);
      const{error}=await supabase.from("attendance").insert({student_id:u.user.id,event_id:event.id});if(error?.code==="23505")throw Error("Attendance already recorded for this event.");if(error)throw error;
      Alert.alert("Attendance recorded",`${event.title}\nScanned: ${new Date().toLocaleString()}`,[{text:"OK",onPress:()=>router.replace("/history")}]);
    }catch(x:any){Alert.alert("Scan failed",x?.message||"Unable to record attendance.", [{text:"Try Again",onPress:()=>setLocked(false)},{text:"Back",onPress:()=>router.replace("/home")}]);}
  }
  return <View style={s.root}><CameraView style={s.cam} facing="back" barcodeScannerSettings={{barcodeTypes:["qr"]}} onBarcodeScanned={scan}/><View style={s.overlay}><Pressable onPress={()=>router.replace("/home")}><Text style={s.back}>‹ Back</Text></Pressable><View style={s.scanBox}><Ionicons name="scan-outline" size={70} color="#fff"/></View><Text style={s.title}>Scan Attendance QR</Text><Text style={s.text}>Point the camera at your teacher's QR code.</Text></View><BottomNav role={role}/></View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.background},cam:{flex:1},overlay:{position:"absolute",left:20,right:20,bottom:85,backgroundColor:"rgba(8,10,22,.92)",padding:20,borderRadius:18,alignItems:"center"},back:{color:COLORS.secondary,fontWeight:"800",alignSelf:"flex-start",marginBottom:10},scanBox:{width:150,height:150,borderWidth:2,borderColor:"#fff",borderRadius:18,alignItems:"center",justifyContent:"center",marginBottom:16},title:{color:"#fff",fontSize:20,fontWeight:"800",marginBottom:6},text:{color:"#D8DCF0",lineHeight:22,textAlign:"center"},center:{flex:1,justifyContent:"center",alignItems:"center",padding:28,backgroundColor:COLORS.background,gap:15},btn:{backgroundColor:COLORS.primary,borderRadius:12,padding:15},btnText:{color:"#fff",fontWeight:"800"}});
