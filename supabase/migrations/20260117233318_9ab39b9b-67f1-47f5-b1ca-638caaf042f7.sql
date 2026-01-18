
-- Better approach: Create a security definer function for searching users
-- This function only returns the fields needed for friend search

CREATE OR REPLACE FUNCTION public.search_users_by_username(search_query TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't allow empty searches
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;
  
  -- Only return users with usernames set, excluding the current user
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.display_name
  FROM profiles p
  WHERE p.username IS NOT NULL
    AND p.username ILIKE search_query
    AND p.user_id != auth.uid()
  LIMIT 10;
END;
$$;

-- Now we can make the SELECT policy more restrictive again
DROP POLICY IF EXISTS "Users can search for profiles by username" ON public.profiles;

-- Users can only view their own profile OR profiles of confirmed friends
CREATE POLICY "Users can view own and friends profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.are_friends(auth.uid(), user_id)
);
