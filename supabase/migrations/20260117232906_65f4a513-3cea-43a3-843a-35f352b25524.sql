-- Create a function to get a friend's class schedules if the viewer is allowed
CREATE OR REPLACE FUNCTION public.get_friend_class_schedules(friend_user_id UUID)
RETURNS TABLE (
  id UUID,
  course_name TEXT,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  location TEXT,
  syllabus_id UUID
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
  
  -- Return the friend's class schedules
  RETURN QUERY
  SELECT 
    cs.id,
    cs.course_name,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    cs.location,
    cs.syllabus_id
  FROM public.class_schedules cs
  INNER JOIN public.syllabi s ON cs.syllabus_id = s.id
  WHERE s.user_id = friend_user_id;
END;
$$;