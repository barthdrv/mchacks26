import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  category: string;
  notes?: string;
}

interface ScheduleDay {
  date: string;
  dayName: string;
  blocks: ScheduleBlock[];
}

interface HomeworkAssignment {
  id: string;
  title: string;
  due_date: string;
  estimated_hours: number;
  course_name: string;
}

interface ClassSchedule {
  course_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
}

interface FriendProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  schedule_visibility: string;
}

interface FriendScheduleData {
  profile: FriendProfile;
  classSchedules: ClassSchedule[];
  plannedEvents: PlannedEvent[];
}

interface PlannedEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  category: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Try to authenticate user - but allow unauthenticated users too (they just won't get academic data)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Service role client for saving planned events (bypasses RLS)
    const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (!userError && user) {
          userId = user.id;
          console.log("Authenticated user:", userId);
        }
      } catch (authError) {
        console.log("Auth check failed, continuing without user context:", authError);
      }
    }

    const { messages, localDate, localDayName, localTime, timezone, friendUsername } = await req.json();
    
    // Use user's local date/time, fallback to server date if not provided
    const userDate = localDate || new Date().toISOString().split('T')[0];
    const userDayName = localDayName || new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const userTime = localTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    console.log(`User's local date: ${userDate} (${userDayName}), current time: ${userTime}, timezone: ${timezone || 'unknown'}`);

    let upcomingAssignments: HomeworkAssignment[] = [];
    let classSchedules: ClassSchedule[] = [];
    let friendScheduleData: FriendScheduleData | null = null;

    // Only fetch academic data if user is authenticated
    if (userId) {
      // Get upcoming assignments (not completed, due within next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: assignmentsData } = await supabaseClient
        .from("homework_assignments")
        .select(`
          id,
          title,
          due_date,
          estimated_hours,
          syllabi!inner(course_name, user_id)
        `)
        .eq("syllabi.user_id", userId)
        .eq("completed", false)
        .lte("due_date", thirtyDaysFromNow.toISOString().split('T')[0])
        .order("due_date", { ascending: true });

      if (assignmentsData) {
        upcomingAssignments = assignmentsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          due_date: a.due_date,
          estimated_hours: Number(a.estimated_hours) || 2,
          course_name: a.syllabi.course_name,
        }));
      }

      // Get class schedules
      const { data: schedulesData } = await supabaseClient
        .from("class_schedules")
        .select(`
          course_name,
          day_of_week,
          start_time,
          end_time,
          location,
          syllabi!inner(user_id)
        `)
        .eq("syllabi.user_id", userId);

      if (schedulesData) {
        classSchedules = schedulesData.map((s: any) => ({
          course_name: s.course_name,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          location: s.location,
        }));
      }

      // If user mentioned a friend by username, try to fetch their schedule
      if (friendUsername) {
        console.log("Looking up friend schedule for:", friendUsername);
        
        // Find friend by username
        const { data: friendProfile } = await supabaseClient
          .from("profiles")
          .select("user_id, username, display_name, schedule_visibility")
          .ilike("username", friendUsername)
          .single();

        if (friendProfile) {
          // Check if they are friends and schedule is public
          const { data: areFriends } = await supabaseClient
            .rpc("are_friends", { user1_id: userId, user2_id: friendProfile.user_id });

          if (areFriends && friendProfile.schedule_visibility === "public") {
            // Fetch friend's class schedules
            const { data: friendSchedules } = await supabaseClient
              .from("class_schedules")
              .select(`
                course_name,
                day_of_week,
                start_time,
                end_time,
                location,
                syllabi!inner(user_id)
              `)
              .eq("syllabi.user_id", friendProfile.user_id);

            // Fetch friend's planned events for the next 7 days
            const today = new Date(userDate);
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            
            const { data: friendPlannedEvents } = await supabaseClient
              .rpc("get_friend_planned_events", {
                friend_user_id: friendProfile.user_id,
                start_date: userDate,
                end_date: weekFromNow.toISOString().split('T')[0]
              });

            friendScheduleData = {
              profile: friendProfile,
              classSchedules: friendSchedules ? friendSchedules.map((s: any) => ({
                course_name: s.course_name,
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
                location: s.location,
              })) : [],
              plannedEvents: friendPlannedEvents || [],
            };
            console.log("Found friend schedule with", friendScheduleData.classSchedules.length, "classes and", friendScheduleData.plannedEvents.length, "planned events");
          } else {
            console.log("Cannot access friend's schedule - not friends or schedule is private");
          }
        } else {
          console.log("Friend not found:", friendUsername);
        }
      }
    }

    // Build academic context for the AI
    let academicContext = "";
    
    if (classSchedules.length > 0) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      academicContext += "\n\nUSER'S CLASS SCHEDULE (these are fixed blocks that cannot be moved):\n";
      classSchedules.forEach((cls) => {
        academicContext += `- ${cls.course_name}: ${dayNames[cls.day_of_week]} ${cls.start_time}-${cls.end_time}${cls.location ? ` at ${cls.location}` : ""}\n`;
      });
    }

    if (upcomingAssignments.length > 0) {
      academicContext += "\n\nUPCOMING HOMEWORK & ASSIGNMENTS (incorporate study time for these):\n";
      upcomingAssignments.forEach((assignment) => {
        const daysUntilDue = Math.ceil(
          (new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        academicContext += `- "${assignment.title}" for ${assignment.course_name}: Due in ${daysUntilDue} days (${assignment.due_date}), estimated ${assignment.estimated_hours} hours\n`;
      });
      academicContext += "\nIMPORTANT: For assignments due soon (1-3 days), schedule dedicated work time. For assignments due later, start them gradually. If the user mentions being unavailable at certain times, work around that.";
    }

    // Add friend schedule context if available
    let friendContext = "";
    if (friendScheduleData) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const friendName = friendScheduleData.profile.display_name || friendScheduleData.profile.username || "your friend";
      friendContext += `\n\nFRIEND'S SCHEDULE (${friendName}):\n`;
      friendContext += `You are planning a meetup with ${friendName}. Here is their schedule - find a time that works for BOTH of you:\n`;
      
      if (friendScheduleData.classSchedules.length > 0) {
        friendContext += `\n${friendName}'s CLASSES:\n`;
        friendScheduleData.classSchedules.forEach((cls) => {
          friendContext += `- ${cls.course_name}: ${dayNames[cls.day_of_week]} ${cls.start_time}-${cls.end_time}\n`;
        });
      }
      
      if (friendScheduleData.plannedEvents.length > 0) {
        friendContext += `\n${friendName}'s PLANNED EVENTS:\n`;
        friendScheduleData.plannedEvents.forEach((event) => {
          friendContext += `- ${event.title}: ${event.event_date} ${event.start_time}-${event.end_time}\n`;
        });
      }
      
      if (friendScheduleData.classSchedules.length > 0 || friendScheduleData.plannedEvents.length > 0) {
        friendContext += `\nIMPORTANT: When scheduling a meetup, avoid BOTH your schedule AND ${friendName}'s classes and planned events. Find a gap that works for both schedules.`;
      } else {
        friendContext += `${friendName} has no classes or events scheduled, so they may be more flexible.`;
      }
    }

    const systemPrompt = `You are an intelligent daily schedule planner. Your job is to take informal user input about what they want to do and create a structured, realistic daily schedule.

CRITICAL TIME CONTEXT:
- Today's date is ${userDate} (${userDayName})
- The current time is ${userTime}
- The user's timezone is ${timezone || 'unknown'}

IMPORTANT RULES:
1. Parse the user's informal text to understand their tasks and preferences
2. Estimate reasonable durations for each activity if not specified
3. **FOR TODAY'S SCHEDULE: You MUST start scheduling from ${userTime} or later. Do NOT schedule anything before the current time since that time has already passed.**
4. Schedule tasks in a logical order (work during business hours, leisure in evening)
5. Include breaks between intensive tasks
6. Be realistic about time - don't overschedule
7. If user mentions multiple days, create schedules for each day. Future days can start from morning.
8. Use 24-hour format for times (e.g., "09:00", "14:30")
9. Categories should be one of: work, personal, health, social, errands, leisure, meal
10. If the user mentions being unavailable or busy at certain times, DO NOT schedule anything during those times
11. Be flexible - if the user's preferences conflict with fixed schedules, prioritize user preferences while noting the conflict
${academicContext}
${friendContext}

SCHEDULING HOMEWORK:
- If there are upcoming assignments, incorporate study/work time into the schedule
- For urgent assignments (due in 1-3 days), prioritize and schedule focused work blocks
- For assignments due later, schedule smaller prep sessions
- Never schedule homework during class times
- Add the category "work" for homework blocks

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "schedules": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "blocks": [
        {
          "id": "unique-id",
          "title": "Task name",
          "startTime": "09:00",
          "endTime": "10:00",
          "duration": 60,
          "category": "work",
          "notes": "optional notes"
        }
      ]
    }
  ],
  "summary": "Brief summary of the planned day(s) including any homework scheduled"
}

If the user says "today", use ${userDate}. If they say "tomorrow", calculate tomorrow's date from ${userDate}. Remember: for today (${userDate}), start from ${userTime} at the earliest!`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let scheduleData;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      scheduleData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse schedule from AI response");
    }

    // Save planned events to database if user is authenticated
    if (userId && supabaseAdmin && scheduleData.schedules) {
      console.log("Saving planned events for user:", userId);
      
      // First, delete existing planned events for the dates being scheduled
      const datesToUpdate = scheduleData.schedules.map((s: ScheduleDay) => s.date);
      if (datesToUpdate.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from("planned_events")
          .delete()
          .eq("user_id", userId)
          .in("event_date", datesToUpdate);
        
        if (deleteError) {
          console.error("Error deleting old planned events:", deleteError);
        }
      }
      
      // Insert new planned events (default to public - is_private: false)
      const eventsToInsert = scheduleData.schedules.flatMap((day: ScheduleDay) =>
        day.blocks.map((block: ScheduleBlock) => ({
          user_id: userId,
          title: block.title,
          event_date: day.date,
          start_time: block.startTime,
          end_time: block.endTime,
          duration: block.duration,
          category: block.category,
          notes: block.notes || null,
          is_private: false, // New events default to public
        }))
      );

      if (eventsToInsert.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("planned_events")
          .insert(eventsToInsert);
        
        if (insertError) {
          console.error("Error saving planned events:", insertError);
        } else {
          console.log("Saved", eventsToInsert.length, "planned events");
        }
      }
    }

    return new Response(JSON.stringify(scheduleData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-schedule error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
