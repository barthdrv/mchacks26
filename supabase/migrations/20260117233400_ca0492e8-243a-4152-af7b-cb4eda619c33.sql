
-- Clean up redundant policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile fully" ON public.profiles;

-- The "Users can view own and friends profiles" policy is the only one we need for SELECT

-- Fix profiles_public view security
-- Since profiles_public is a VIEW (not a table), we can't add RLS directly
-- Instead, drop and recreate it with security_invoker=on to inherit base table RLS
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    user_id,
    username,
    display_name,
    schedule_visibility
  FROM public.profiles;

-- The view now inherits RLS from the profiles table due to security_invoker=on
