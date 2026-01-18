import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Syllabus, HomeworkAssignment, ClassSchedule, ParsedSyllabusData } from "@/types/syllabus";

export function useSyllabus(userId: string | undefined) {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch syllabi
      const { data: syllabiData, error: syllabiError } = await supabase
        .from("syllabi")
        .select("*")
        .order("created_at", { ascending: false });

      if (syllabiError) throw syllabiError;
      setSyllabi(syllabiData || []);

      // Fetch assignments with course name
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("homework_assignments")
        .select(`
          *,
          syllabi!inner(course_name)
        `)
        .order("due_date", { ascending: true });

      if (assignmentsError) throw assignmentsError;
      
      const formattedAssignments = (assignmentsData || []).map((a: any) => ({
        ...a,
        course_name: a.syllabi?.course_name,
      }));
      setAssignments(formattedAssignments);

      // Fetch class schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("class_schedules")
        .select("*")
        .order("day_of_week", { ascending: true });

      if (schedulesError) throw schedulesError;
      setClassSchedules(schedulesData || []);
    } catch (error) {
      console.error("Error fetching syllabus data:", error);
      toast.error("Failed to load syllabus data");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Upload and parse syllabus
  const uploadSyllabus = useCallback(async (file: File) => {
    if (!userId) {
      toast.error("Please sign in to upload a syllabus");
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("syllabi")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Call edge function to parse the syllabus
      const { data: parseResult, error: parseError } = await supabase.functions
        .invoke("parse-syllabus", {
          body: { filePath, fileName: file.name },
        });

      if (parseError) throw parseError;

      if (parseResult.error) {
        throw new Error(parseResult.error);
      }

      const parsedData = parseResult as ParsedSyllabusData;

      // Create syllabus record
      const { data: syllabusRecord, error: syllabusError } = await supabase
        .from("syllabi")
        .insert({
          user_id: userId,
          file_path: filePath,
          course_name: parsedData.course_name,
          semester_end_date: parsedData.semester_end_date || null,
        })
        .select()
        .single();

      if (syllabusError) throw syllabusError;

      // Insert assignments
      if (parsedData.assignments.length > 0) {
        const assignmentsToInsert = parsedData.assignments.map((a) => ({
          syllabus_id: syllabusRecord.id,
          title: a.title,
          description: a.description || null,
          due_date: a.due_date,
          estimated_hours: a.estimated_hours || 2,
        }));

        const { error: assignmentsError } = await supabase
          .from("homework_assignments")
          .insert(assignmentsToInsert);

        if (assignmentsError) throw assignmentsError;
      }

      // Insert class schedules
      if (parsedData.class_schedule.length > 0) {
        const schedulesToInsert = parsedData.class_schedule.map((s) => ({
          syllabus_id: syllabusRecord.id,
          course_name: parsedData.course_name,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          location: s.location || null,
        }));

        const { error: schedulesError } = await supabase
          .from("class_schedules")
          .insert(schedulesToInsert);

        if (schedulesError) throw schedulesError;
      }

      toast.success(`Syllabus for "${parsedData.course_name}" uploaded successfully!`);
      await fetchData();
    } catch (error) {
      console.error("Error uploading syllabus:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload syllabus");
    } finally {
      setIsUploading(false);
    }
  }, [userId, fetchData]);

  // Toggle assignment completion
  const toggleAssignmentComplete = useCallback(async (assignmentId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("homework_assignments")
        .update({ completed })
        .eq("id", assignmentId);

      if (error) throw error;

      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, completed } : a))
      );
      
      if (completed) {
        toast.success("Assignment marked as complete!");
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    }
  }, []);

  // Delete assignment
  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("homework_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success("Assignment removed");
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  }, []);

  // Update syllabus (e.g., course name)
  const updateSyllabus = useCallback(async (
    syllabusId: string,
    updates: { course_name?: string; semester_end_date?: string | null }
  ) => {
    try {
      const { error } = await supabase
        .from("syllabi")
        .update(updates)
        .eq("id", syllabusId);

      if (error) throw error;

      // Also update course_name in related class_schedules if course_name changed
      if (updates.course_name) {
        const { error: scheduleError } = await supabase
          .from("class_schedules")
          .update({ course_name: updates.course_name })
          .eq("syllabus_id", syllabusId);

        if (scheduleError) throw scheduleError;
      }

      toast.success("Course updated");
      await fetchData();
    } catch (error) {
      console.error("Error updating syllabus:", error);
      toast.error("Failed to update course");
    }
  }, [fetchData]);

  // Delete syllabus
  const deleteSyllabus = useCallback(async (syllabusId: string) => {
    try {
      const syllabus = syllabi.find((s) => s.id === syllabusId);
      if (syllabus && syllabus.file_path !== 'manual') {
        // Delete file from storage (skip for manual entries)
        await supabase.storage.from("syllabi").remove([syllabus.file_path]);
      }

      // Delete syllabus record (cascades to assignments and schedules)
      const { error } = await supabase
        .from("syllabi")
        .delete()
        .eq("id", syllabusId);

      if (error) throw error;

      toast.success("Syllabus deleted");
      await fetchData();
    } catch (error) {
      console.error("Error deleting syllabus:", error);
      toast.error("Failed to delete syllabus");
    }
  }, [syllabi, fetchData]);

  // Add class schedule manually
  const addClassSchedule = useCallback(async (schedule: {
    course_name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string;
    syllabus_id?: string;
  }) => {
    if (!userId) {
      toast.error("Please sign in to add a class schedule");
      return;
    }

    try {
      // If no syllabus_id, find existing syllabus or create a placeholder
      let syllabusId = schedule.syllabus_id;
      
      if (!syllabusId) {
        // Check if ANY syllabus already exists for this course (imported or manual)
        const existingSyllabus = syllabi.find(
          s => s.course_name === schedule.course_name
        );
        
        if (existingSyllabus) {
          syllabusId = existingSyllabus.id;
        } else {
          // Create a new manual syllabus only if no existing course found
          const { data: newSyllabus, error: syllabusError } = await supabase
            .from("syllabi")
            .insert({
              user_id: userId,
              file_path: 'manual',
              course_name: schedule.course_name,
            })
            .select()
            .single();
          
          if (syllabusError) throw syllabusError;
          syllabusId = newSyllabus.id;
        }
      }

      const { error } = await supabase
        .from("class_schedules")
        .insert({
          syllabus_id: syllabusId,
          course_name: schedule.course_name,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          location: schedule.location || null,
        });

      if (error) throw error;

      toast.success("Class schedule added");
      await fetchData();
    } catch (error) {
      console.error("Error adding class schedule:", error);
      toast.error("Failed to add class schedule");
    }
  }, [userId, syllabi, fetchData]);

  // Update class schedule
  const updateClassSchedule = useCallback(async (
    scheduleId: string,
    updates: {
      course_name?: string;
      day_of_week?: number;
      start_time?: string;
      end_time?: string;
      location?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase
        .from("class_schedules")
        .update(updates)
        .eq("id", scheduleId);

      if (error) throw error;

      setClassSchedules((prev) =>
        prev.map((s) => (s.id === scheduleId ? { ...s, ...updates } : s))
      );
      toast.success("Class schedule updated");
    } catch (error) {
      console.error("Error updating class schedule:", error);
      toast.error("Failed to update class schedule");
    }
  }, []);

  // Delete class schedule
  const deleteClassSchedule = useCallback(async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from("class_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;

      setClassSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      toast.success("Class schedule deleted");
    } catch (error) {
      console.error("Error deleting class schedule:", error);
      toast.error("Failed to delete class schedule");
    }
  }, []);

  // Get upcoming assignments (not completed, due in the future or today)
  const upcomingAssignments = assignments.filter((a) => {
    if (a.completed) return false;
    const dueDate = new Date(a.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate >= today;
  });

  // Get today's classes
  const getTodaysClasses = useCallback(() => {
    const today = new Date().getDay();
    return classSchedules.filter((s) => s.day_of_week === today);
  }, [classSchedules]);

  // Get classes for a specific day
  const getClassesForDay = useCallback((dayOfWeek: number) => {
    return classSchedules.filter((s) => s.day_of_week === dayOfWeek);
  }, [classSchedules]);

  return {
    syllabi,
    assignments,
    classSchedules,
    upcomingAssignments,
    isLoading,
    isUploading,
    uploadSyllabus,
    updateSyllabus,
    toggleAssignmentComplete,
    deleteAssignment,
    deleteSyllabus,
    addClassSchedule,
    updateClassSchedule,
    deleteClassSchedule,
    getTodaysClasses,
    getClassesForDay,
    refreshData: fetchData,
  };
}
