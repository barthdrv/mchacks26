import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Message, ScheduleDay, ScheduleResponse } from "@/types/schedule";

const STORAGE_KEY = "scheduler_data";

interface StoredData {
  schedules: ScheduleDay[];
  messages: Message[];
  summary: string;
  lastUpdated: string;
}

export function useScheduler(userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: StoredData = JSON.parse(saved);
        // Check if the saved data is from today
        const today = new Date().toISOString().split("T")[0];
        const savedDate = data.lastUpdated.split("T")[0];
        
        if (savedDate === today) {
          setMessages(data.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          setSchedules(data.schedules);
          setSummary(data.summary);
          setHasSchedule(data.schedules.length > 0);
        }
      } catch (e) {
        console.error("Failed to load saved schedule:", e);
      }
    }
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (schedules.length > 0 || messages.length > 0) {
      const data: StoredData = {
        schedules,
        messages,
        summary,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [schedules, messages, summary]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Get user's local date and time info
      const now = new Date();
      const localDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const localDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const localTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM format
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { data, error } = await supabase.functions.invoke("generate-schedule", {
        body: {
          messages: [
            ...conversationHistory,
            { role: "user", content },
          ],
          userId, // Pass userId to include academic data
          localDate, // User's local date
          localDayName, // User's local day name
          localTime, // User's current local time
          timezone, // User's timezone
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const response = data as ScheduleResponse;

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.summary,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSchedules(response.schedules);
      setSummary(response.summary);
      setHasSchedule(true);

      toast.success("Schedule created!");
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate schedule. Please try again."
      );

      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I had trouble creating your schedule. Could you try describing your day again?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, userId]);

  const resetSchedule = useCallback(() => {
    setHasSchedule(false);
  }, []);

  const clearAll = useCallback(() => {
    setMessages([]);
    setSchedules([]);
    setSummary("");
    setHasSchedule(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeScheduleBlocksForText = useCallback((text: string) => {
    const needle = text.trim().toLowerCase();
    if (!needle) return;

    setSchedules((prev) => {
      const next = prev.map((day) => ({
        ...day,
        blocks: day.blocks.filter((block) => {
          const haystack = `${block.title} ${block.notes ?? ""}`.toLowerCase();
          return !haystack.includes(needle);
        }),
      }));

      setHasSchedule(next.some((d) => d.blocks.length > 0));
      return next;
    });
  }, []);

  return {
    messages,
    schedules,
    summary,
    isLoading,
    hasSchedule,
    sendMessage,
    resetSchedule,
    clearAll,
    removeScheduleBlocksForText,
  };
}
