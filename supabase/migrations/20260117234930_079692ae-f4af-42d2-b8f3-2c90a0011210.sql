-- Fix search function to support partial matching
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_query text)
RETURNS TABLE(user_id uuid, username text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Don't allow empty searches
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;
  
  -- Return users with usernames that contain the search query (case-insensitive)
  -- Excludes the current user from results
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name
  FROM profiles p
  WHERE p.username IS NOT NULL
    AND p.username ILIKE '%' || trim(search_query) || '%'
    AND p.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 10;
END;
$$;