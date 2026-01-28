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

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per minute per identifier
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up expired rate limit entries periodically
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Check rate limit for a given identifier (IP or phone)
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

// Input validation constants
const MAX_NAME_LENGTH = 100;
const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_PRICE_LENGTH = 50;
const MAX_DURATION_LENGTH = 50;
const MAX_DATE_LENGTH = 100;
const MAX_TIME_LENGTH = 10;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 255;

// Validation helpers
function isValidPortuguesePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return /^9\d{8}$/.test(cleanPhone) || /^351?9\d{8}$/.test(cleanPhone);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function sanitizeString(str: string): string {
  // Remove any HTML tags and trim whitespace
  return str.replace(/<[^>]*>/g, '').trim();
}

interface BookingNotificationRequest {
  serviceName: string;
  servicePrice: string;
  serviceDuration: string;
  date: string;
  time: string;
  endTime?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  bookingId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateRequest(data: BookingNotificationRequest): ValidationResult {
  const errors: string[] = [];

  // Required field checks
  if (!data.serviceName || typeof data.serviceName !== 'string') {
    errors.push("serviceName é obrigatório");
  } else if (data.serviceName.length > MAX_SERVICE_NAME_LENGTH) {
    errors.push(`serviceName não pode exceder ${MAX_SERVICE_NAME_LENGTH} caracteres`);
  }

  if (!data.servicePrice || typeof data.servicePrice !== 'string') {
    errors.push("servicePrice é obrigatório");
  } else if (data.servicePrice.length > MAX_PRICE_LENGTH) {
    errors.push(`servicePrice não pode exceder ${MAX_PRICE_LENGTH} caracteres`);
  }

  if (!data.serviceDuration || typeof data.serviceDuration !== 'string') {
    errors.push("serviceDuration é obrigatório");
  } else if (data.serviceDuration.length > MAX_DURATION_LENGTH) {
    errors.push(`serviceDuration não pode exceder ${MAX_DURATION_LENGTH} caracteres`);
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push("date é obrigatório");
  } else if (data.date.length > MAX_DATE_LENGTH) {
    errors.push(`date não pode exceder ${MAX_DATE_LENGTH} caracteres`);
  }

  if (!data.time || typeof data.time !== 'string') {
    errors.push("time é obrigatório");
  } else if (!isValidTimeFormat(data.time)) {
    errors.push("time deve estar no formato HH:MM");
  } else if (data.time.length > MAX_TIME_LENGTH) {
    errors.push(`time não pode exceder ${MAX_TIME_LENGTH} caracteres`);
  }

  if (!data.clientName || typeof data.clientName !== 'string') {
    errors.push("clientName é obrigatório");
  } else if (data.clientName.trim().length === 0) {
    errors.push("clientName não pode estar vazio");
  } else if (data.clientName.length > MAX_NAME_LENGTH) {
    errors.push(`clientName não pode exceder ${MAX_NAME_LENGTH} caracteres`);
  }

  if (!data.clientPhone || typeof data.clientPhone !== 'string') {
    errors.push("clientPhone é obrigatório");
  } else if (!isValidPortuguesePhone(data.clientPhone)) {
    errors.push("clientPhone deve ser um número português válido (9XX XXX XXX)");
  } else if (data.clientPhone.length > MAX_PHONE_LENGTH) {
    errors.push(`clientPhone não pode exceder ${MAX_PHONE_LENGTH} caracteres`);
  }

  // Optional field validation
  if (data.clientEmail) {
    if (typeof data.clientEmail !== 'string') {
      errors.push("clientEmail deve ser uma string");
    } else if (!isValidEmail(data.clientEmail)) {
      errors.push("clientEmail deve ser um email válido");
    } else if (data.clientEmail.length > MAX_EMAIL_LENGTH) {
      errors.push(`clientEmail não pode exceder ${MAX_EMAIL_LENGTH} caracteres`);
    }
  }

  if (data.bookingId && typeof data.bookingId !== 'string') {
    errors.push("bookingId deve ser uma string");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper to calculate end time if not provided
function calculateEndTime(startTime: string, durationStr: string): string {
  // Try to parse duration from string like "1h30m" or "30min" or "2h"
  let totalMinutes = 0;
  
  const hoursMatch = durationStr.match(/(\d+)\s*h/i);
  const minutesMatch = durationStr.match(/(\d+)\s*m/i);
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  
  // If we couldn't parse, default to 30 minutes
  if (totalMinutes === 0) {
    totalMinutes = 30;
  }
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + totalMinutes;
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

// Parse Portuguese date format (e.g., "15 de Janeiro de 2025") to YYYY-MM-DD
function parseDateToYYYYMMDD(dateStr: string): string {
  const months: { [key: string]: string } = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
  };
  
  // Try "DD de Month de YYYY" format
  const ptMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const month = months[ptMatch[2]] || '01';
    const year = ptMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY format
  const numMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (numMatch) {
    return `${numMatch[3]}-${numMatch[2].padStart(2, '0')}-${numMatch[1].padStart(2, '0')}`;
  }
  
  // Return as-is if no pattern matches
  return dateStr;
}

// Generate Google Calendar URL
function generateGoogleCalendarUrl(
  serviceName: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  clientName: string
): string {
  const date = parseDateToYYYYMMDD(dateStr);
  
  // Format: YYYYMMDDTHHMMSS
  const startDateTime = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
  const endDateTime = `${date.replace(/-/g, '')}T${endTime.replace(':', '')}00`;
  
  const title = encodeURIComponent(`M.VBeautiful - ${serviceName}`);
  const details = encodeURIComponent(`Marcação confirmada em M.VBeautiful\n\nServiço: ${serviceName}\nCliente: ${clientName}\n\nContacto: @m.vbeautiful no Instagram`);
  const location = encodeURIComponent('M.VBeautiful');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
}

// Generate ICS file content for Apple Calendar/Outlook
function generateICSContent(
  serviceName: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  clientName: string
): string {
  const date = parseDateToYYYYMMDD(dateStr);
  
  // Format: YYYYMMDDTHHMMSS
  const startDateTime = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
  const endDateTime = `${date.replace(/-/g, '')}T${endTime.replace(':', '')}00`;
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//M.VBeautiful//Booking//PT
BEGIN:VEVENT
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:M.VBeautiful - ${serviceName}
DESCRIPTION:Marcação confirmada em M.VBeautiful\\n\\nServiço: ${serviceName}\\nCliente: ${clientName}\\n\\nContacto: @m.vbeautiful no Instagram
LOCATION:M.VBeautiful
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

// Generate data URI for ICS download
function generateICSDataUri(icsContent: string): string {
  const base64Content = btoa(unescape(encodeURIComponent(icsContent)));
  return `data:text/calendar;charset=utf-8;base64,${base64Content}`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received booking notification request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Parse request body
    let requestData: BookingNotificationRequest;
    try {
      requestData = await req.json();
    } catch {
      console.error("Invalid JSON in request body");
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input data
    const validation = validateRequest(requestData);
    if (!validation.isValid) {
      console.error("Validation failed:", validation.errors);
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: validation.errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      serviceName, 
      servicePrice, 
      serviceDuration, 
      date, 
      time, 
      endTime,
      clientName, 
      clientPhone,
      clientEmail,
      bookingId
    } = requestData;

    // Sanitize inputs
    const sanitizedServiceName = sanitizeString(serviceName);
    const sanitizedServicePrice = sanitizeString(servicePrice);
    const sanitizedServiceDuration = sanitizeString(serviceDuration);
    const sanitizedDate = sanitizeString(date);
    const sanitizedTime = sanitizeString(time);
    const sanitizedClientName = sanitizeString(clientName);
    const sanitizedClientPhone = clientPhone.replace(/\D/g, "");
    const sanitizedClientEmail = clientEmail ? sanitizeString(clientEmail) : undefined;
    
    // Calculate end time if not provided
    const calculatedEndTime = endTime ? sanitizeString(endTime) : calculateEndTime(sanitizedTime, sanitizedServiceDuration);

    // Rate limit check using both IP and phone number
    const rateLimitKey = `${clientIP}-${sanitizedClientPhone}`;
    if (isRateLimited(rateLimitKey)) {
      console.warn(`Rate limit exceeded for ${rateLimitKey}`);
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Por favor, aguarde um momento." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Booking details:", { 
      serviceName: sanitizedServiceName, 
      date: sanitizedDate, 
      time: sanitizedTime, 
      endTime: calculatedEndTime,
      clientName: sanitizedClientName, 
      clientPhone: sanitizedClientPhone, 
      clientEmail: sanitizedClientEmail 
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify booking exists if bookingId is provided
    if (bookingId) {
      const { data: bookingExists, error: bookingCheckError } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingCheckError) {
        console.error("Error checking booking:", bookingCheckError);
      } else if (!bookingExists) {
        console.warn("Booking not found, proceeding without relation:", bookingId);
      }
    }

    // Create in-app notification for admin/professionals
    const adminNotification = {
      title: `Nova Marcação - ${sanitizedServiceName}`,
      message: `${sanitizedClientName} marcou ${sanitizedServiceName} para ${sanitizedDate} às ${sanitizedTime}. Preço: ${sanitizedServicePrice}`,
      type: "booking",
      client_phone: sanitizedClientPhone,
      related_booking_id: bookingId || null,
    };

    const { error: adminNotifError } = await supabase
      .from("notifications")
      .insert(adminNotification);

    if (adminNotifError) {
      console.error("Error creating admin notification:", adminNotifError);
    } else {
      console.log("Admin notification created successfully");
    }

    // Create in-app notification for client
    const clientNotification = {
      title: "Marcação Confirmada!",
      message: `A sua marcação de ${sanitizedServiceName} está confirmada para ${sanitizedDate} às ${sanitizedTime}. Preço: ${sanitizedServicePrice}. Obrigada por escolher M.VBeautiful!`,
      type: "booking",
      client_phone: sanitizedClientPhone,
      related_booking_id: bookingId || null,
    };

    const { error: clientNotifError } = await supabase
      .from("notifications")
      .insert(clientNotification);

    if (clientNotifError) {
      console.error("Error creating client notification:", clientNotifError);
    } else {
      console.log("Client notification created successfully");
    }

    // Send email to admin
    if (notificationEmail) {
      const whatsappLink = `https://wa.me/${sanitizedClientPhone}?text=${encodeURIComponent('Olá ' + sanitizedClientName + '! A sua marcação em M.VBeautiful está confirmada.')}`;

      const adminEmailResponse = await resend.emails.send({
        from: "M.VBeautiful <geral@mvbeautiful.com>",
        to: [notificationEmail],
        subject: `Nova Marcação - ${sanitizedServiceName}`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf6f3;">
            <h1 style="color: #d4a5a5; text-align: center; font-size: 28px; margin-bottom: 30px;">
              ✨ Nova Marcação ✨
            </h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #d4a5a5; padding-bottom: 10px;">
                Detalhes do Serviço
              </h2>
              <p style="margin: 10px 0;"><strong>Serviço:</strong> ${sanitizedServiceName}</p>
              <p style="margin: 10px 0;"><strong>Preço:</strong> ${sanitizedServicePrice}</p>
              <p style="margin: 10px 0;"><strong>Duração:</strong> ${sanitizedServiceDuration}</p>
              
              <h2 style="color: #333; font-size: 20px; margin: 25px 0 20px; border-bottom: 2px solid #d4a5a5; padding-bottom: 10px;">
                Data e Hora
              </h2>
              <p style="margin: 10px 0;"><strong>Data:</strong> ${sanitizedDate}</p>
              <p style="margin: 10px 0;"><strong>Hora:</strong> ${sanitizedTime}</p>
              
              <h2 style="color: #333; font-size: 20px; margin: 25px 0 20px; border-bottom: 2px solid #d4a5a5; padding-bottom: 10px;">
                Dados do Cliente
              </h2>
              <p style="margin: 10px 0;"><strong>Nome:</strong> ${sanitizedClientName}</p>
              <p style="margin: 10px 0;"><strong>Telemóvel:</strong> ${sanitizedClientPhone}</p>
              ${sanitizedClientEmail ? `<p style="margin: 10px 0;"><strong>Email:</strong> ${sanitizedClientEmail}</p>` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  📱 Contactar Cliente via WhatsApp
                </a>
              </div>
            </div>
            
            <p style="text-align: center; color: #888; margin-top: 30px; font-size: 14px;">
              M.VBeautiful by Marta Vilela<br>
              @m.vbeautiful
            </p>
          </div>
        `,
      });

      console.log("Admin email sent:", adminEmailResponse);
    }

    // Send confirmation email to client if they provided email
    if (sanitizedClientEmail) {
      // Generate calendar links for client
      const googleCalendarUrl = generateGoogleCalendarUrl(
        sanitizedServiceName,
        sanitizedDate,
        sanitizedTime,
        calculatedEndTime,
        sanitizedClientName
      );
      
      const icsContent = generateICSContent(
        sanitizedServiceName,
        sanitizedDate,
        sanitizedTime,
        calculatedEndTime,
        sanitizedClientName
      );
      const icsDataUri = generateICSDataUri(icsContent);

      const clientEmailResponse = await resend.emails.send({
        from: "M.VBeautiful <geral@mvbeautiful.com>",
        to: [sanitizedClientEmail],
        subject: `Marcação Confirmada - ${sanitizedServiceName}`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf6f3;">
            <h1 style="color: #d4a5a5; text-align: center; font-size: 28px; margin-bottom: 30px;">
              ✨ Marcação Confirmada ✨
            </h1>
            
            <div style="background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; text-align: center; color: #333; margin-bottom: 25px;">
                Olá <strong>${sanitizedClientName}</strong>!<br>
                A sua marcação foi confirmada com sucesso.
              </p>
              
              <h2 style="color: #333; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #d4a5a5; padding-bottom: 10px;">
                Detalhes da sua Marcação
              </h2>
              <p style="margin: 10px 0;"><strong>Serviço:</strong> ${sanitizedServiceName}</p>
              <p style="margin: 10px 0;"><strong>Preço:</strong> ${sanitizedServicePrice}</p>
              <p style="margin: 10px 0;"><strong>Duração:</strong> ${sanitizedServiceDuration}</p>
              <p style="margin: 10px 0;"><strong>Data:</strong> ${sanitizedDate}</p>
              <p style="margin: 10px 0;"><strong>Hora:</strong> ${sanitizedTime}</p>
              
              <h2 style="color: #333; font-size: 20px; margin: 25px 0 20px; border-bottom: 2px solid #d4a5a5; padding-bottom: 10px;">
                📅 Adicionar ao Calendário
              </h2>
              <p style="text-align: center; color: #666; font-size: 14px; margin-bottom: 15px;">
                Não se esqueça da sua marcação! Adicione ao seu calendário:
              </p>
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">
                  📆 Google Calendar
                </a>
                <a href="${icsDataUri}" download="mvbeautiful-marcacao.ics" style="display: inline-block; background-color: #333333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin: 5px;">
                  🍎 Apple / Outlook
                </a>
              </div>
              
              <div style="background-color: #fdf6f3; padding: 15px; border-radius: 8px; margin-top: 25px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Em caso de necessidade de cancelamento ou alteração, por favor contacte-nos com antecedência.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://instagram.com/m.vbeautiful" style="color: #d4a5a5; text-decoration: none; font-weight: bold;">
                @m.vbeautiful
              </a>
            </div>
            
            <p style="text-align: center; color: #888; margin-top: 20px; font-size: 14px;">
              Obrigada por escolher M.VBeautiful!<br>
              Marta Vilela
            </p>
          </div>
        `,
      });

      console.log("Client email sent:", clientEmailResponse);
    }

    // Create Google Calendar event for the responsible admin
    // This is done as a background task to not block the response
    try {
      // Parse the date to get a proper date string (YYYY-MM-DD format)
      const dateMatch = sanitizedDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      let dateStr = sanitizedDate;
      
      if (dateMatch) {
        // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
        dateStr = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      }
      
      console.log("Creating Google Calendar event...", { dateStr, time: sanitizedTime, endTime: calculatedEndTime });
      
      const gcResponse = await fetch(
        `${supabaseUrl}/functions/v1/google-calendar-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}` // Service role bypasses JWT
          },
          body: JSON.stringify({
            serviceName: sanitizedServiceName,
            clientName: sanitizedClientName,
            clientPhone: sanitizedClientPhone,
            clientEmail: sanitizedClientEmail,
            bookingDate: dateStr,
            startTime: sanitizedTime,
            endTime: calculatedEndTime,
            sendClientInvite: !!sanitizedClientEmail
          })
        }
      );
      
      if (gcResponse.ok) {
        const gcData = await gcResponse.json();
        console.log("Google Calendar event created successfully:", gcData);
      } else {
        const gcError = await gcResponse.text();
        console.error("Google Calendar event creation failed:", gcResponse.status, gcError);
      }
    } catch (gcError) {
      console.error("Failed to create Google Calendar event:", gcError);
      // Non-blocking - booking still succeeds even if calendar fails
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
