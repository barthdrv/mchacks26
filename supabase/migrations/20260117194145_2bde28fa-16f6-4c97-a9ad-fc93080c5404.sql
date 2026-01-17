-- Add DELETE policy for profiles table to complete the security model
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (user_id = auth.uid());