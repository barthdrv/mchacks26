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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create authenticated client and verify user
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user ID from claims - ignore any userId from request body
    const userId = claimsData.claims.sub as string;

    const { messages } = await req.json();

    let upcomingAssignments: HomeworkAssignment[] = [];
    let classSchedules: ClassSchedule[] = [];

    // Fetch user's academic data using authenticated user's ID
    // Get upcoming assignments (not completed, due within next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: assignmentsData } = await supabaseAuth
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
    const { data: schedulesData } = await supabaseAuth
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

    const systemPrompt = `You are an intelligent daily schedule planner. Your job is to take informal user input about what they want to do and create a structured, realistic daily schedule.

IMPORTANT RULES:
1. Parse the user's informal text to understand their tasks and preferences
2. Estimate reasonable durations for each activity if not specified
3. Schedule tasks in a logical order (morning routines first, work during business hours, leisure in evening)
4. Include breaks between intensive tasks
5. Be realistic about time - don't overschedule
6. If user mentions multiple days, create schedules for each day
7. Use 24-hour format for times (e.g., "09:00", "14:30")
8. Categories should be one of: work, personal, health, social, errands, leisure, meal
9. If the user mentions being unavailable or busy at certain times, DO NOT schedule anything during those times
10. Be flexible - if the user's preferences conflict with fixed schedules, prioritize user preferences while noting the conflict
${academicContext}

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

Today's date is ${new Date().toISOString().split('T')[0]}. If the user says "today", use today's date. If they say "tomorrow", use tomorrow's date.`;

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
