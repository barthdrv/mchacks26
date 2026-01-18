
-- Create planned_events table to store schedules created via AI chat
CREATE TABLE public.planned_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  category TEXT NOT NULL DEFAULT 'personal',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planned_events ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own planned events
CREATE POLICY "Users can view own planned events"
ON public.planned_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planned events"
ON public.planned_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planned events"
ON public.planned_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planned events"
ON public.planned_events FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_planned_events_updated_at
BEFORE UPDATE ON public.planned_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_planned_events_user_date ON public.planned_events(user_id, event_date);

-- Create a function to get friend's planned events (similar to get_friend_class_schedules)
CREATE OR REPLACE FUNCTION public.get_friend_planned_events(friend_user_id UUID, start_date DATE, end_date DATE)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  duration INTEGER,
  category TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller can view this friend's schedule
  IF NOT public.can_view_schedule(auth.uid(), friend_user_id) THEN
    RETURN;
  END IF;
  
  -- Return the friend's planned events within date range
  RETURN QUERY
  SELECT 
    pe.id,
    pe.title,
    pe.event_date,
    pe.start_time,
    pe.end_time,
    pe.duration,
    pe.category,
    pe.notes
  FROM public.planned_events pe
  WHERE pe.user_id = friend_user_id
    AND pe.event_date >= start_date
    AND pe.event_date <= end_date;
END;
$$;
