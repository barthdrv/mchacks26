export interface Syllabus {
  id: string;
  user_id: string;
  file_path: string;
  course_name: string;
  semester_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeworkAssignment {
  id: string;
  syllabus_id: string;
  title: string;
  description: string | null;
  due_date: string;
  estimated_hours: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
  course_name?: string; // joined from syllabus
}

export interface ClassSchedule {
  id: string;
  syllabus_id: string;
  course_name: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  location: string | null;
  created_at: string;
}

export interface ParsedSyllabusData {
  course_name: string;
  semester_end_date?: string;
  assignments: Array<{
    title: string;
    description?: string;
    due_date: string;
    estimated_hours?: number;
  }>;
  class_schedule: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string;
  }>;
}
