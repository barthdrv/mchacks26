export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  category: 'work' | 'personal' | 'health' | 'social' | 'errands' | 'leisure' | 'meal';
  notes?: string;
}

export interface ScheduleDay {
  date: string;
  dayName: string;
  blocks: ScheduleBlock[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ScheduleResponse {
  schedules: ScheduleDay[];
  summary: string;
}
