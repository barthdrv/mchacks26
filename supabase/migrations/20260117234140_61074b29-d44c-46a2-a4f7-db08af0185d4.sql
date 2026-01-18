-- Add is_private column to planned_events table
ALTER TABLE public.planned_events 
ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Update the get_friend_planned_events function to exclude private events
CREATE OR REPLACE FUNCTION public.get_friend_planned_events(friend_user_id uuid, start_date date, end_date date)
RETURNS TABLE(
  id uuid,
  title text,
  event_date date,
  start_time time,
  end_time time,
  duration integer,
  category text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return events if the viewer can see the friend's schedule
  IF NOT can_view_schedule(friend_user_id, auth.uid()) THEN
    RETURN;
  END IF;
  
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
  FROM planned_events pe
  WHERE pe.user_id = friend_user_id
    AND pe.event_date >= start_date
    AND pe.event_date <= end_date
    AND pe.is_private = false;  -- Exclude private events
END;
$$;