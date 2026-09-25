import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export default function Index(){const[loading,setLoading]=useState(true);const[has,setHas]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setHas(!!data.session);setLoading(false);});},[]);if(loading)return null;return <Redirect href={has?"/home":"/login"}/>;}
