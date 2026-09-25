import AsyncStorage from "@react-native-async-storage/async-storage";
import {createClient} from "@supabase/supabase-js";
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_KEY;
if(!url||!key) throw new Error("Supabase configuration is missing. Create .env from .env.example.");
export const supabase=createClient(url,key,{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
