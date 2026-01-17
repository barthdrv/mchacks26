import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
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

    // Get authenticated user ID from claims
    const userId = claimsData.claims.sub as string;

    const { filePath, fileName } = await req.json();

    // Validate file path belongs to the authenticated user
    // File paths should be in format: {user_id}/filename
    const pathParts = filePath.split("/");
    if (pathParts[0] !== userId) {
      console.error("File path ownership mismatch:", { filePath, userId });
      return new Response(
        JSON.stringify({ error: "Forbidden: You can only access your own files" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role key to access storage
    // This is needed because storage bucket is private
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("syllabi")
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    const mimeType = fileExtension === "pdf" 
      ? "application/pdf" 
      : fileExtension === "docx" 
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/msword";

    const systemPrompt = `You are an expert at parsing academic syllabi. Your job is to extract structured information from course syllabi including:
1. Course name
2. Semester end date (if mentioned)
3. All homework assignments, exams, projects, and due dates
4. Weekly class schedule (days and times)

IMPORTANT RULES:
- Extract ALL assignments, quizzes, exams, projects, and any work with due dates
- For each assignment, estimate hours needed if not specified (2-4 hours for homework, 6-10 hours for projects, 4-6 hours for exam prep)
- For class schedules, use 0=Sunday through 6=Saturday
- Use 24-hour format for times (e.g., "14:30")
- Dates should be in YYYY-MM-DD format
- If a specific date isn't given, estimate based on context (e.g., "Week 3" would be ~3 weeks from semester start)
- Today's date is ${new Date().toISOString().split('T')[0]}

You MUST respond with ONLY valid JSON, no markdown, no explanation:
{
  "course_name": "Course Name",
  "semester_end_date": "YYYY-MM-DD or null if not found",
  "assignments": [
    {
      "title": "Assignment name",
      "description": "Brief description",
      "due_date": "YYYY-MM-DD",
      "estimated_hours": 3
    }
  ],
  "class_schedule": [
    {
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "10:30",
      "location": "Room 101"
    }
  ]
}`;

    // Call Lovable AI to parse the syllabus
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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please parse this syllabus document (${fileName}) and extract all the information.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
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
    let parsedData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse syllabus data from AI response");
    }

    // Validate and clean the parsed data
    const result = {
      course_name: parsedData.course_name || "Unknown Course",
      semester_end_date: parsedData.semester_end_date || null,
      assignments: (parsedData.assignments || []).map((a: any) => ({
        title: a.title || "Untitled Assignment",
        description: a.description || null,
        due_date: a.due_date || new Date().toISOString().split('T')[0],
        estimated_hours: a.estimated_hours || 2,
      })),
      class_schedule: (parsedData.class_schedule || []).map((s: any) => ({
        day_of_week: typeof s.day_of_week === 'number' ? s.day_of_week : 1,
        start_time: s.start_time || "09:00",
        end_time: s.end_time || "10:00",
        location: s.location || null,
      })),
    };

    console.log("Parsed syllabus for user:", userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-syllabus error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
