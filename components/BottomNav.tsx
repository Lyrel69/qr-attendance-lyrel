import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/colors";

type Item = { label: string; icon: keyof typeof Ionicons.glyphMap; route: string };

export function BottomNav({ role }: { role: "student" | "teacher" | "admin" }) {
  const path = usePathname();
  const items: Item[] = role === "admin"
    ? [
        { label: "Admin", icon: "shield-checkmark-outline", route: "/admin" },
        { label: "Profile", icon: "person-outline", route: "/profile" },
      ]
    : [
        { label: "Home", icon: "home-outline", route: "/home" },
        { label: "Scan", icon: "scan-outline", route: "/scan" },
        { label: "History", icon: "time-outline", route: "/history" },
        { label: "Profile", icon: "person-outline", route: "/profile" },
        ...(role === "teacher" ? [{ label: "Teacher", icon: "school-outline", route: "/teacher" } as Item] : []),
      ];
  return (
    <View style={s.bar}>
      {items.map((item) => {
        const active = path === item.route || (item.route === "/teacher" && path.startsWith("/create-event"));
        return (
          <Pressable key={item.route} style={s.item} onPress={() => router.replace(item.route)}>
            <Ionicons name={item.icon} size={23} color={active ? COLORS.secondary : COLORS.muted} />
            <Text style={[s.label, active && s.active]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 8 },
  item: { flex: 1, alignItems: "center", gap: 3 },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  active: { color: COLORS.secondary },
});
