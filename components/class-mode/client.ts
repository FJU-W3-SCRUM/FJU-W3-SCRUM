import { supabase } from '@/lib/supabase/client';

export interface CreateSessionResult { id: string }

export interface TeacherClassSummary {
  id: string;
  class_name: string;
}

export async function getActiveClassSessions() {
  const res = await fetch('/api/class-mode/sessions');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch sessions');
  }
  return res.json();
}

export async function createClassSession(class_id: string, title: string): Promise<CreateSessionResult> {
  const res = await fetch('/api/class-mode/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_id, title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

export async function getSeatMap(session_id: string) {
  const res = await fetch(`/api/class-mode/seats?session_id=${session_id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch seat map');
  }
  return res.json();
}

export async function selectSeat(session_id: string, seat_row: number, seat_col: number, account_id: string) {
  const res = await fetch('/api/class-mode/seats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, seat_row, seat_col, account_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to select seat');
  }
  return res.json();
}

export async function getTeacherClasses(): Promise<TeacherClassSummary[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, class_name')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch classes');
  }

  return (data || []) as TeacherClassSummary[];
}
