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
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 cancellation requests per minute per IP
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

// Input validation constants
const MAX_NAME_LENGTH = 100;
const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_TIME_LENGTH = 10;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 255;
const MAX_ID_LENGTH = 100;

// Validation helpers
function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDateFormat(date: string): boolean {
  // Accept YYYY-MM-DD format
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

interface CancellationRequest {
  bookingId: string;
  serviceName: string;
  bookingDate: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateRequest(data: CancellationRequest): ValidationResult {
  const errors: string[] = [];

  if (!data.bookingId || typeof data.bookingId !== 'string') {
    errors.push("bookingId é obrigatório");
  } else if (data.bookingId.length > MAX_ID_LENGTH) {
    errors.push(`bookingId não pode exceder ${MAX_ID_LENGTH} caracteres`);
  }

  if (!data.serviceName || typeof data.serviceName !== 'string') {
    errors.push("serviceName é obrigatório");
  } else if (data.serviceName.length > MAX_SERVICE_NAME_LENGTH) {
    errors.push(`serviceName não pode exceder ${MAX_SERVICE_NAME_LENGTH} caracteres`);
  }

  if (!data.bookingDate || typeof data.bookingDate !== 'string') {
    errors.push("bookingDate é obrigatório");
  } else if (!isValidDateFormat(data.bookingDate)) {
    errors.push("bookingDate deve estar no formato YYYY-MM-DD");
  }

  if (!data.startTime || typeof data.startTime !== 'string') {
    errors.push("startTime é obrigatório");
  } else if (!isValidTimeFormat(data.startTime)) {
    errors.push("startTime deve estar no formato HH:MM");
  } else if (data.startTime.length > MAX_TIME_LENGTH) {
    errors.push(`startTime não pode exceder ${MAX_TIME_LENGTH} caracteres`);
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
  } else if (data.clientPhone.length > MAX_PHONE_LENGTH) {
    errors.push(`clientPhone não pode exceder ${MAX_PHONE_LENGTH} caracteres`);
  }

  if (data.clientEmail) {
    if (typeof data.clientEmail !== 'string') {
      errors.push("clientEmail deve ser uma string");
    } else if (!isValidEmail(data.clientEmail)) {
      errors.push("clientEmail deve ser um email válido");
    } else if (data.clientEmail.length > MAX_EMAIL_LENGTH) {
      errors.push(`clientEmail não pode exceder ${MAX_EMAIL_LENGTH} caracteres`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Processing cancellation notification...");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Rate limit check
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Por favor, aguarde um momento." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    let requestData: CancellationRequest;
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

    const { bookingId, serviceName, bookingDate, startTime, clientName, clientPhone, clientEmail } = requestData;

    // Sanitize inputs
    const sanitizedBookingId = sanitizeString(bookingId);
    const sanitizedServiceName = sanitizeString(serviceName);
    const sanitizedBookingDate = sanitizeString(bookingDate);
    const sanitizedStartTime = sanitizeString(startTime);
    const sanitizedClientName = sanitizeString(clientName);
    const sanitizedClientPhone = clientPhone.replace(/\D/g, "");
    const sanitizedClientEmail = clientEmail ? sanitizeString(clientEmail) : undefined;

    console.log("Cancellation details:", { 
      bookingId: sanitizedBookingId, 
      serviceName: sanitizedServiceName, 
      bookingDate: sanitizedBookingDate, 
      clientName: sanitizedClientName 
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format date for display
    const dateObj = new Date(sanitizedBookingDate);
    const formattedDate = dateObj.toLocaleDateString("pt-PT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create in-app notification for client
    const clientNotification = {
      title: "Marcação Cancelada",
      message: `A sua marcação de ${sanitizedServiceName} para ${formattedDate} às ${sanitizedStartTime} foi cancelada.`,
      type: "cancellation",
      client_phone: sanitizedClientPhone,
    };

    const { error: clientNotifError } = await supabase
      .from("notifications")
      .insert(clientNotification);

    if (clientNotifError) {
      console.error("Error creating client cancellation notification:", clientNotifError);
    } else {
      console.log("Client cancellation notification created successfully");
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
            title: "Marcação Cancelada",
            body: `A sua marcação de ${sanitizedServiceName} para ${formattedDate} às ${sanitizedStartTime} foi cancelada.`,
            url: "/minha-conta/marcacoes",
            tag: `cancellation-${sanitizedBookingId}`,
          },
        }),
      });
      
      if (pushResponse.ok) {
        console.log("Push notification sent for cancellation");
      } else {
        console.log("Push notification not sent (client may not be subscribed)");
      }
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
      // Non-blocking
    }

    // Send email to admins (notification email) about the cancellation
    if (notificationEmail) {
      try {
        await resend.emails.send({
          from: "M.VBeautiful <geral@mvbeautiful.com>",
          to: [notificationEmail],
          subject: `❌ Marcação Cancelada - ${sanitizedServiceName}`,
          html: `
            <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fdf6f3;">
              <h1 style="color: #dc2626; text-align: center; font-size: 24px; margin-bottom: 20px;">
                ❌ Marcação Cancelada
              </h1>
              
              <div style="background-color: white; padding: 20px; border-radius: 10px;">
                <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Cliente:</strong> ${sanitizedClientName}</p>
                  <p style="margin: 5px 0;"><strong>Telefone:</strong> ${sanitizedClientPhone}</p>
                  ${sanitizedClientEmail ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${sanitizedClientEmail}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Serviço:</strong> ${sanitizedServiceName}</p>
                  <p style="margin: 5px 0;"><strong>Data:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0;"><strong>Hora:</strong> ${sanitizedStartTime}</p>
                </div>
                
                <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                  A cliente cancelou esta marcação. O horário foi libertado automaticamente.
                </p>
              </div>
              
              <p style="text-align: center; color: #888; margin-top: 15px; font-size: 12px;">
                M.VBeautiful - Sistema de Marcações
              </p>
            </div>
          `,
        });
        console.log(`Cancellation email sent to admin ${notificationEmail}`);
      } catch (emailError) {
        console.error("Failed to send admin cancellation email:", emailError);
        // Non-blocking - continue even if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-cancellation-notification:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
