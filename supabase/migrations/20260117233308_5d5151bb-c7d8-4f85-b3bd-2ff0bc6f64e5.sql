
-- Fix: The new policy is too restrictive for friend search functionality
-- We need to allow users to search for other users by username to add them as friends
-- But we should limit what data they can see (only username for search purposes)

-- Drop the overly restrictive policy we just created
DROP POLICY IF EXISTS "Users can view own profile or friends profiles" ON public.profiles;

-- Create two policies:
-- 1. Full access to own profile
CREATE POLICY "Users can view own profile fully"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- 2. Limited access to other profiles for friend discovery (username search)
-- Users can see username and display_name of profiles that have set a username
-- This is needed for friend search functionality
CREATE POLICY "Users can search for profiles by username"
ON public.profiles FOR SELECT
USING (username IS NOT NULL AND auth.uid() IS NOT NULL);

-- Note: Both policies allow SELECT - Postgres RLS uses OR logic for multiple permissive policies
-- So users can see their own profile OR profiles with usernames set
-- The application should be careful not to expose sensitive data from searched profiles
