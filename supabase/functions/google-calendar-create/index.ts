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

async function getValidAccessToken(supabase: any, userId: string): Promise<{ accessToken: string | null; calendarId: string }> {
  const { data: tokens, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokens) {
    console.log(`No tokens found for user ${userId}`);
    return { accessToken: null, calendarId: "primary" };
  }

  const calendarId = tokens.calendar_id || "primary";

  if (new Date(tokens.token_expiry) < new Date()) {
    console.log("Token expired, refreshing...");
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
      console.error("Error refreshing token:", refreshData.error);
      return { accessToken: null, calendarId };
    }

    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshData.expires_in);

    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: refreshData.access_token,
        token_expiry: newExpiry.toISOString(),
      })
      .eq("user_id", userId);

    return { accessToken: refreshData.access_token, calendarId };
  }

  return { accessToken: tokens.access_token, calendarId };
}

// Find the responsible admin for a service
async function getResponsibleAdminId(supabase: any, serviceName: string): Promise<string | null> {
  // First try to find by service name in services table
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("responsible_admin_id")
    .eq("name", serviceName)
    .maybeSingle();

  if (!serviceError && service?.responsible_admin_id) {
    console.log(`Found responsible admin ${service.responsible_admin_id} for service "${serviceName}"`);
    return service.responsible_admin_id;
  }

  // If not found in services, try service_options
  const { data: option, error: optionError } = await supabase
    .from("service_options")
    .select("service_id")
    .eq("name", serviceName)
    .maybeSingle();

  if (!optionError && option?.service_id) {
    // Get the parent service's responsible admin
    const { data: parentService } = await supabase
      .from("services")
      .select("responsible_admin_id")
      .eq("id", option.service_id)
      .maybeSingle();

    if (parentService?.responsible_admin_id) {
      console.log(`Found responsible admin ${parentService.responsible_admin_id} for option "${serviceName}" via parent service`);
      return parentService.responsible_admin_id;
    }
  }

  console.log(`No specific responsible admin found for "${serviceName}", will use fallback`);
  return null;
}

// Get any connected admin (fallback)
async function getAnyConnectedAdmin(supabase: any): Promise<string | null> {
  const { data: tokens } = await supabase
    .from("google_calendar_tokens")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  return tokens?.user_id || null;
}

interface CreateEventRequest {
  userId?: string | null; // Optional - will be determined by service if not provided
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  sendClientInvite?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Google Calendar Create Event request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!googleClientId || !googleClientSecret) {
    console.log("Google Calendar not configured, skipping event creation");
    return new Response(
      JSON.stringify({ skipped: true, message: "Google Calendar not configured" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const requestData: CreateEventRequest = await req.json();
    const {
      serviceName,
      clientName,
      clientPhone,
      clientEmail,
      bookingDate,
      startTime,
      endTime,
      sendClientInvite = true,
    } = requestData;

    console.log(`Processing booking for service: "${serviceName}"`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which admin should receive this event
    let targetUserId: string | null = requestData.userId || null;
    
    if (!targetUserId) {
      // Find responsible admin based on service
      targetUserId = await getResponsibleAdminId(supabase, serviceName);
    }
    
    if (!targetUserId) {
      // Fallback to any connected admin
      targetUserId = await getAnyConnectedAdmin(supabase);
    }

    if (!targetUserId) {
      console.log("No admin connected to Google Calendar, skipping event creation");
      return new Response(
        JSON.stringify({ skipped: true, message: "No admin connected to Google Calendar" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Target admin user ID: ${targetUserId}`);

    const { accessToken, calendarId } = await getValidAccessToken(supabase, targetUserId);

    if (!accessToken) {
      console.log("No valid access token for target admin, skipping Google Calendar event");
      return new Response(
        JSON.stringify({ skipped: true, message: "Target admin not connected to Google Calendar" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build start and end datetime
    const startDateTime = new Date(`${bookingDate}T${startTime}:00`);
    const endDateTime = new Date(`${bookingDate}T${endTime}:00`);

    // Create event object
    const event: any = {
      summary: `M.VBeautiful: ${serviceName}`,
      description: `Cliente: ${clientName}\nTelemóvel: ${clientPhone}${clientEmail ? `\nEmail: ${clientEmail}` : ""}\n\nMarcação via M.VBeautiful`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Europe/Lisbon",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Europe/Lisbon",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 1440 }, // 24 hours
        ],
      },
    };

    // Add client as attendee if they have email and we want to send invite
    if (clientEmail && sendClientInvite) {
      event.attendees = [
        { email: clientEmail, displayName: clientName },
      ];
    }

    console.log("Creating Google Calendar event:", event.summary, "on calendar:", calendarId);

    // Create the event
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=${sendClientInvite && clientEmail ? "all" : "none"}`;

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const createData = await createResponse.json();

    if (createData.error) {
      console.error("Error creating event:", createData.error);
      return new Response(
        JSON.stringify({ error: createData.error.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Google Calendar event created:", createData.id);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: createData.id,
        eventLink: createData.htmlLink,
        targetAdminId: targetUserId,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in google-calendar-create:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
