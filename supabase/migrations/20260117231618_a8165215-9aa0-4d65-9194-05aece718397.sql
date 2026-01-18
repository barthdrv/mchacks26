-- Add username and schedule visibility to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS schedule_visibility TEXT NOT NULL DEFAULT 'private' 
  CHECK (schedule_visibility IN ('private', 'public'));

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create friendships table (denormalized for easier queries)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS for friend_requests: users can see requests they sent or received
CREATE POLICY "Users can view their own friend requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests they received"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS for friendships: users can see their own friendships
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "System can insert friendships"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = user1_id AND friend_id = user2_id)
       OR (user_id = user2_id AND friend_id = user1_id)
  )
$$;

-- Function to check if user can view another user's schedule
CREATE OR REPLACE FUNCTION public.can_view_schedule(viewer_id UUID, owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    viewer_id = owner_id -- Can always view own schedule
    OR (
      -- Can view if schedule is public AND they are friends
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = owner_id 
        AND schedule_visibility = 'public'
      )
      AND public.are_friends(viewer_id, owner_id)
    )
$$;

-- Create a public view for profile lookups (without exposing sensitive data)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  user_id,
  username,
  display_name,
  schedule_visibility
FROM public.profiles
WHERE username IS NOT NULL;

-- Update profiles RLS to allow looking up other users by username
CREATE POLICY "Users can view public profile info"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR username IS NOT NULL
);

-- Trigger for updated_at on friend_requests
CREATE TRIGGER update_friend_requests_updated_at
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();