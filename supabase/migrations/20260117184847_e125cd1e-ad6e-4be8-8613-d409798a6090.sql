-- Create profiles table for user data (since we can't reference auth.users directly)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create syllabi table
CREATE TABLE public.syllabi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  course_name TEXT NOT NULL,
  semester_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework_assignments table
CREATE TABLE public.homework_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syllabus_id UUID NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  estimated_hours NUMERIC(4,1) DEFAULT 2,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_schedules table
CREATE TABLE public.class_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  syllabus_id UUID NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for syllabi files
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabi', 'syllabi', false);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Helper function to check syllabus ownership
CREATE OR REPLACE FUNCTION public.is_syllabus_owner(syllabus_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.syllabi
    WHERE id = syllabus_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Syllabi RLS policies
CREATE POLICY "Users can view own syllabi" ON public.syllabi
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own syllabi" ON public.syllabi
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own syllabi" ON public.syllabi
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own syllabi" ON public.syllabi
  FOR DELETE USING (user_id = auth.uid());

-- Homework assignments RLS policies
CREATE POLICY "Users can view own homework" ON public.homework_assignments
  FOR SELECT USING (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can insert own homework" ON public.homework_assignments
  FOR INSERT WITH CHECK (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can update own homework" ON public.homework_assignments
  FOR UPDATE USING (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can delete own homework" ON public.homework_assignments
  FOR DELETE USING (public.is_syllabus_owner(syllabus_id));

-- Class schedules RLS policies
CREATE POLICY "Users can view own class schedules" ON public.class_schedules
  FOR SELECT USING (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can insert own class schedules" ON public.class_schedules
  FOR INSERT WITH CHECK (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can update own class schedules" ON public.class_schedules
  FOR UPDATE USING (public.is_syllabus_owner(syllabus_id));

CREATE POLICY "Users can delete own class schedules" ON public.class_schedules
  FOR DELETE USING (public.is_syllabus_owner(syllabus_id));

-- Storage policies for syllabi bucket
CREATE POLICY "Users can upload own syllabus files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own syllabus files" ON storage.objects
  FOR SELECT USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own syllabus files" ON storage.objects
  FOR DELETE USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_syllabi_updated_at
  BEFORE UPDATE ON public.syllabi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();