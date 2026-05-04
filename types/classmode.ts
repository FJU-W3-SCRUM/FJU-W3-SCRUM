export interface ClassModeSession {
  id: string;
  title: string;
  class_name?: string;
  starts_at?: string;
  status?: string;
}

export interface SeatMapEntry {
  seat_x: number;
  seat_y: number;
  user_id: string;
  student_name?: string;
  student_id?: string;
}
