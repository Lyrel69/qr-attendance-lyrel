import { supabase } from "./supabase";

export type Role = "student" | "teacher";

export async function requireUser(role?: Role) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  if (role) {
    const metadataRole = data.user.user_metadata?.role as Role | undefined;
    if (metadataRole && metadataRole !== role) return null;
  }
  return data.user;
}

export function makeEventCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
