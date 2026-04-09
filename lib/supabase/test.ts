import { supabase } from "./client";

export async function testQuery() {
  const { data, error } = await supabase
    .from("test")
    .select("*")
    .order("id", { ascending: true })
    .limit(100);
  if (error) throw error;
  return data;
}
