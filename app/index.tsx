import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCurrentRole, type Role } from "../lib/profiles";
import { COLORS } from "../constants/colors";

export default function Index() {
  const [destination, setDestination] = useState<"/login" | "/home" | "/teacher" | "/admin" | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        setDestination("/login");
        return;
      }
      const role: Role = await getCurrentRole(data.user.id);
      if (active) setDestination(role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/home");
    })();
    return () => { active = false; };
  }, []);

  if (!destination) {
    return <View style={s.loading}><ActivityIndicator color={COLORS.secondary} /></View>;
  }
  return <Redirect href={destination} />;
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
});
