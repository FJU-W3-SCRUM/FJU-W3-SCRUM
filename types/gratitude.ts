export interface GratitudePost {
  id: number;
  sender_account_id: number;
  recipient_account_id: number;
  content: string;
  class_id: number | null;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_student_no?: string;
  recipient_name?: string;
  recipient_student_no?: string;
}

export interface GratitudePostInsert {
  sender_account_id: number;
  recipient_account_id: number;
  content: string;
  class_id?: number;
}

export interface GratitudePostUpdate {
  content: string;
}
