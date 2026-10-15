import { supabase } from "./supabase";
import { getCurrentRole, type Role } from "./profiles";

export async function requireUser(role?: Role) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  if (role && (await getCurrentRole(data.user.id)) !== role) return null;
  return data.user;
}

export function makeEventCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
