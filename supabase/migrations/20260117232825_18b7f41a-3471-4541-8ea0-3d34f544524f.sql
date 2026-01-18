-- Drop the existing insert policy that's too restrictive
DROP POLICY IF EXISTS "System can insert friendships" ON public.friendships;

-- Create a new policy that allows inserting friendships when accepting a request
-- User can insert a friendship row if:
-- 1. They are the user_id (their own friendship record), OR
-- 2. They received a pending friend request from the friend_id
CREATE POLICY "Users can insert friendships when accepting requests"
ON public.friendships FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE from_user_id = friendships.user_id 
    AND to_user_id = auth.uid()
    AND status = 'accepted'
  )
);