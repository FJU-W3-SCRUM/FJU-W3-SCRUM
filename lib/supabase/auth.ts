import { supabase } from "./client";

export interface UserProfile {
  id: string;
  name: string;
  role: "teacher" | "student";
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
