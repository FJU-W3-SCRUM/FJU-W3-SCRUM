import { SupabaseClient } from '@supabase/supabase-js';
import type { GratitudePost, GratitudePostInsert, GratitudePostUpdate } from '@/types/gratitude';

export async function getGratitudePostsByClass(
  supabase: SupabaseClient,
  classId: number
): Promise<GratitudePost[]> {
  const { data, error } = await supabase
    .from('gratitude_wall')
    .select(`
      id, sender_account_id, recipient_account_id, content, class_id, created_at, updated_at,
      sender:accounts!gratitude_wall_sender_account_id_fkey(id, name, student_no),
      recipient:accounts!gratitude_wall_recipient_account_id_fkey(id, name, student_no)
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    sender_account_id: row.sender_account_id,
    recipient_account_id: row.recipient_account_id,
    content: row.content,
    class_id: row.class_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sender_name: row.sender?.name,
    sender_student_no: row.sender?.student_no,
    recipient_name: row.recipient?.name,
    recipient_student_no: row.recipient?.student_no,
  }));
}

export async function createGratitudePost(
  supabase: SupabaseClient,
  payload: GratitudePostInsert
): Promise<GratitudePost> {
  const { data, error } = await supabase
    .from('gratitude_wall')
    .insert(payload)
    .select(`
      id, sender_account_id, recipient_account_id, content, class_id, created_at, updated_at,
      sender:accounts!gratitude_wall_sender_account_id_fkey(id, name, student_no),
      recipient:accounts!gratitude_wall_recipient_account_id_fkey(id, name, student_no)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    sender_account_id: data.sender_account_id,
    recipient_account_id: data.recipient_account_id,
    content: data.content,
    class_id: data.class_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    sender_name: (data.sender as any)?.name,
    sender_student_no: (data.sender as any)?.student_no,
    recipient_name: (data.recipient as any)?.name,
    recipient_student_no: (data.recipient as any)?.student_no,
  };
}

export async function updateGratitudePost(
  supabase: SupabaseClient,
  id: number,
  payload: GratitudePostUpdate
): Promise<void> {
  const { error } = await supabase
    .from('gratitude_wall')
    .update({ content: payload.content, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteGratitudePost(
  supabase: SupabaseClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from('gratitude_wall')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
