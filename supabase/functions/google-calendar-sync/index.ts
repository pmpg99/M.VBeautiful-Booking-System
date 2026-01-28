import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokens, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokens) {
    console.log("No tokens found for user");
    return null;
  }

  // Check if token is expired
  if (new Date(tokens.token_expiry) < new Date()) {
    console.log("Token expired, refreshing...");
    
    // Refresh the token
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId!,
        client_secret: googleClientSecret!,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshResponse.json();

    if (refreshData.error) {
      console.error("Token refresh failed:", refreshData);
      return null;
    }

    // Update tokens
    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshData.expires_in);

    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: refreshData.access_token,
        token_expiry: newExpiry.toISOString(),
      })
      .eq("user_id", userId);

    return refreshData.access_token;
  }

  return tokens.access_token;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Google Calendar Sync request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!googleClientId || !googleClientSecret) {
    return new Response(
      JSON.stringify({ error: "Google Calendar not configured" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { action, userId, date, calendarId = "primary" } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getValidAccessToken(supabase, userId);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not authenticated with Google Calendar" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "getEvents") {
      // Get events for a specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;

      const eventsResponse = await fetch(eventsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const eventsData = await eventsResponse.json();

      if (eventsData.error) {
        console.error("Error fetching events:", eventsData.error);
        return new Response(
          JSON.stringify({ error: eventsData.error.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Transform events to blocked time format
      const blockedSlots = (eventsData.items || [])
        .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
        .map((event: any) => ({
          id: event.id,
          summary: event.summary || "Busy",
          start_time: new Date(event.start.dateTime).toTimeString().slice(0, 5),
          end_time: new Date(event.end.dateTime).toTimeString().slice(0, 5),
          source: "google_calendar",
        }));

      console.log(`Found ${blockedSlots.length} Google Calendar events for ${date}`);

      return new Response(
        JSON.stringify({ events: blockedSlots }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "listCalendars") {
      const calendarsResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const calendarsData = await calendarsResponse.json();

      return new Response(
        JSON.stringify({ calendars: calendarsData.items || [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in google-calendar-sync:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
