import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlannedEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  category: string;
  notes: string | null;
  is_private: boolean;
}

export function usePlannedEvents(userId?: string) {
  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async (startDate?: string, endDate?: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("planned_events" as any)
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (startDate) {
        query = query.gte("event_date", startDate);
      }
      if (endDate) {
        query = query.lte("event_date", endDate);
      }

      const { data, error } = await query as any;

      if (error) throw error;

      setEvents((data || []) as PlannedEvent[]);
    } catch (error) {
      console.error("Error fetching planned events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateEventPrivacy = useCallback((eventId: string, isPrivate: boolean) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { ...event, is_private: isPrivate }
          : event
      )
    );
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("planned_events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", userId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast.success("Event deleted");
      return true;
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      return false;
    }
  }, [userId]);

  // Initial fetch on mount
  useEffect(() => {
    if (userId) {
      fetchEvents();
    }
  }, [userId, fetchEvents]);

  return {
    events,
    isLoading,
    fetchEvents,
    updateEventPrivacy,
    deleteEvent,
  };
}
