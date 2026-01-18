
-- Fix: Insert missing friendship records for accepted requests
-- First: juju (from) -> lulu (to) - request id 997fa7be
INSERT INTO friendships (user_id, friend_id)
VALUES 
  ('be5d009a-4f1f-4a7f-81b1-ce6d66bbf605', 'f8b458b4-336b-4489-9866-075b901fc0e6')
ON CONFLICT DO NOTHING;

-- Second: lulu (from) -> juju (to) - request id 04abb8aa
INSERT INTO friendships (user_id, friend_id)
VALUES 
  ('f8b458b4-336b-4489-9866-075b901fc0e6', 'be5d009a-4f1f-4a7f-81b1-ce6d66bbf605')
ON CONFLICT DO NOTHING;

-- Security Fix 1: Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view public profile info" ON public.profiles;

-- Security Fix 2: Create a more restrictive SELECT policy for profiles
-- Users can view their own profile OR profiles of confirmed friends only
CREATE POLICY "Users can view own profile or friends profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.are_friends(auth.uid(), user_id)
);

-- Security Fix 3: Add RLS to the profiles_public view
-- Note: Views inherit RLS from underlying tables with security_invoker=on
-- The view was created WITH (security_invoker=on) so it respects profiles RLS
-- But we should also ensure the view only exposes necessary fields for search

-- Add an index on username for faster friend search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
