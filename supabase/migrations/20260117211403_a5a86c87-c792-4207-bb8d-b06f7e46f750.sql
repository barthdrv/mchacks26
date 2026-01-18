-- Remove email column from profiles table as it duplicates auth.users data
-- This reduces attack surface by not storing PII that's already in auth.users
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the trigger function to not set email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;