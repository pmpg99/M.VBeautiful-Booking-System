import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting - prevents abuse if called externally
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

function isRateLimited(identifier: string): boolean {
  cleanupRateLimitMap();
  
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);
  
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  existing.count++;
  return false;
}

// Sanitization helper
function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  reminder_sent: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Starting booking reminder check...");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown";

  // Rate limit check to prevent abuse
  if (isRateLimited(clientIP)) {
    console.warn(`Rate limit exceeded for ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Muitas requisições. Por favor, aguarde um momento." }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date in Lisbon timezone (Portugal)
    // Edge functions run in UTC, so we need to calculate the correct local date
    const now = new Date();
    const lisbonFormatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Europe/Lisbon', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const todayLisbon = lisbonFormatter.format(now);
    const tomorrowLisbon = new Date(todayLisbon + 'T12:00:00');
    tomorrowLisbon.setDate(tomorrowLisbon.getDate() + 1);
    const tomorrowStr = lisbonFormatter.format(tomorrowLisbon);

    console.log(`Checking for bookings on ${tomorrowStr}...`);

    // Find bookings for tomorrow that haven't been reminded
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", tomorrowStr)
      .eq("reminder_sent", false);

    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      throw fetchError;
    }

    if (!bookings || bookings.length === 0) {
      console.log("No bookings to remind.");
      return new Response(
        JSON.stringify({ message: "No bookings to remind", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${bookings.length} bookings to remind.`);

    let successCount = 0;
    let errorCount = 0;

    for (const booking of bookings as Booking[]) {
      try {
        console.log(`Processing reminder for booking ${booking.id}...`);

        // Sanitize data from database before using in templates
        const sanitizedClientName = sanitizeString(booking.client_name);
        const sanitizedServiceName = sanitizeString(booking.service_name);
        const sanitizedClientPhone = booking.client_phone.replace(/\D/g, "");
        const sanitizedClientEmail = booking.client_email ? sanitizeString(booking.client_email) : null;
        const sanitizedStartTime = booking.start_time.slice(0, 5);
        const sanitizedEndTime = booking.end_time.slice(0, 5);

        // Format date for display
        const dateObj = new Date(booking.booking_date);
        const formattedDate = dateObj.toLocaleDateString("pt-PT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Create in-app notification for client
        const clientNotification = {
          title: "Lembrete: Marcação Amanhã!",
          message: `Olá ${sanitizedClientName}! Relembramos que tem ${sanitizedServiceName} marcado para amanhã às ${sanitizedStartTime}. Até já!`,
          type: "reminder",
          client_phone: sanitizedClientPhone,
          related_booking_id: booking.id,
        };

        const { error: clientNotifError } = await supabase
          .from("notifications")
          .insert(clientNotification);

        if (clientNotifError) {
          console.error("Error creating client reminder notification:", clientNotifError);
        }

        // Create in-app notification for admin
        const adminNotification = {
          title: `Lembrete: ${sanitizedServiceName}`,
          message: `${sanitizedClientName} tem marcação amanhã às ${sanitizedStartTime}.`,
          type: "reminder",
          client_phone: sanitizedClientPhone,
          related_booking_id: booking.id,
        };

        const { error: adminNotifError } = await supabase
          .from("notifications")
          .insert(adminNotification);

        if (adminNotifError) {
          console.error("Error creating admin reminder notification:", adminNotifError);
        }

        // Send email to admin
        if (notificationEmail) {
          try {
            await resend.emails.send({
              from: "M.VBeautiful <onboarding@resend.dev>",
              to: [notificationEmail],
              subject: `Lembrete: Marcação Amanhã - ${sanitizedServiceName}`,
              html: `
                <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf6f3;">
                  <h1 style="color: #d4a5a5; text-align: center; font-size: 24px; margin-bottom: 20px;">
                    ⏰ Lembrete de Marcação ⏰
                  </h1>
                  
                  <div style="background-color: white; padding: 20px; border-radius: 10px;">
                    <p style="font-size: 16px; margin-bottom: 15px;">
                      Marcação para <strong>amanhã</strong>:
                    </p>
                    
                    <p><strong>Serviço:</strong> ${sanitizedServiceName}</p>
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Hora:</strong> ${sanitizedStartTime} - ${sanitizedEndTime}</p>
                    <p><strong>Cliente:</strong> ${sanitizedClientName}</p>
                    <p><strong>Telemóvel:</strong> ${sanitizedClientPhone}</p>
                    ${sanitizedClientEmail ? `<p><strong>Email:</strong> ${sanitizedClientEmail}</p>` : ""}
                  </div>
                  
                  <p style="text-align: center; color: #888; margin-top: 20px; font-size: 12px;">
                    M.VBeautiful by Marta Vilela
                  </p>
                </div>
              `,
            });
            console.log(`Admin reminder email sent for booking ${booking.id}`);
          } catch (emailError) {
            console.error(`Failed to send admin reminder email for booking ${booking.id}:`, emailError);
          }
        }

        // Send email to client if they have an email
        if (sanitizedClientEmail) {
          try {
            await resend.emails.send({
              from: "M.VBeautiful <onboarding@resend.dev>",
              to: [sanitizedClientEmail],
              subject: `Lembrete: A sua marcação é amanhã!`,
              html: `
                <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf6f3;">
                  <h1 style="color: #d4a5a5; text-align: center; font-size: 24px; margin-bottom: 20px;">
                    ⏰ Lembrete de Marcação ⏰
                  </h1>
                  
                  <div style="background-color: white; padding: 20px; border-radius: 10px;">
                    <p style="font-size: 16px; text-align: center; margin-bottom: 20px;">
                      Olá <strong>${sanitizedClientName}</strong>!
                    </p>
                    
                    <p style="text-align: center; margin-bottom: 20px;">
                      Relembramos que tem uma marcação <strong>amanhã</strong>:
                    </p>
                    
                    <div style="background-color: #fdf6f3; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Serviço:</strong> ${sanitizedServiceName}</p>
                      <p style="margin: 5px 0;"><strong>Data:</strong> ${formattedDate}</p>
                      <p style="margin: 5px 0;"><strong>Hora:</strong> ${sanitizedStartTime}</p>
                    </div>
                    
                    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                      Se precisar de alterar ou cancelar, por favor contacte-nos o mais rapidamente possível.
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 20px;">
                    <a href="https://instagram.com/m.vbeautiful" style="color: #d4a5a5; text-decoration: none;">
                      @m.vbeautiful
                    </a>
                  </div>
                  
                  <p style="text-align: center; color: #888; margin-top: 15px; font-size: 12px;">
                    Até amanhã!<br>M.VBeautiful by Marta Vilela
                  </p>
                </div>
              `,
            });
            console.log(`Client reminder email sent for booking ${booking.id}`);
          } catch (emailError) {
            console.error(`Failed to send client reminder email for booking ${booking.id}:`, emailError);
          }
        }

        // Send push notification to client
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              client_phone: sanitizedClientPhone,
              payload: {
                title: "Lembrete de Marcação",
                body: `A sua marcação de ${sanitizedServiceName} é amanhã às ${sanitizedStartTime}!`,
                url: "/minha-conta/marcacoes",
                tag: `reminder-${booking.id}`,
              },
            }),
          });
          
          if (pushResponse.ok) {
            console.log(`Push notification sent for booking ${booking.id}`);
          }
        } catch (pushError) {
          console.error(`Error sending push notification for booking ${booking.id}:`, pushError);
        }

        // Mark as reminded
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        if (updateError) {
          console.error("Error updating reminder_sent:", updateError);
        } else {
          successCount++;
        }
      } catch (bookingError) {
        console.error(`Error processing booking ${booking.id}:`, bookingError);
        errorCount++;
      }
    }

    console.log(`Reminder job completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: "Reminder job completed",
        success: successCount,
        errors: errorCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-reminder:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
