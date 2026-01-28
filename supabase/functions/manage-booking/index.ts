import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageBookingRequest {
  action: "create" | "cancel" | "reschedule" | "update_client_info";
  booking_id?: string;
  payload: {
    // For create
    service_name?: string;
    service_duration?: number;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    client_name?: string;
    client_phone?: string;
    client_email?: string;
    is_admin_booking?: boolean;
    responsible_admin_id?: string; // ID of the professional responsible for the service
    // For reschedule
    new_date?: string;
    new_start_time?: string;
    new_end_time?: string;
  };
}

// Convert time string to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format duration for display
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

// Format price for display
function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")}€`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - sem token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user roles
    const { data: isAdminResult } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id });
    const isAdmin = isAdminResult === true;

    // Get client record for non-admin users
    let clientRecord: { id: string; phone: string; email: string | null; name: string } | null = null;
    if (!isAdmin) {
      const { data: clientData } = await supabaseAdmin
        .from('clients')
        .select('id, phone, email, name')
        .eq('user_id', user.id)
        .maybeSingle();
      clientRecord = clientData;
    }

    // Parse request body
    const body: ManageBookingRequest = await req.json();
    const { action, booking_id, payload } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${action} by user ${user.id} (admin: ${isAdmin})`);

    // ============================================
    // ACTION: CREATE
    // ============================================
    if (action === "create") {
      const { 
        service_name, service_duration, booking_date, start_time, end_time,
        client_name, client_phone, client_email, is_admin_booking, responsible_admin_id 
      } = payload;

      // Validate required fields
      if (!service_name || !service_duration || !booking_date || !start_time || !end_time || !client_name || !client_phone) {
        return new Response(
          JSON.stringify({ error: 'Campos obrigatórios em falta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanPhone = client_phone.replace(/\s/g, '');

      // Admin booking: find or create client
      if (isAdmin && is_admin_booking) {
        const { data: existingClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (!existingClient) {
          await supabaseAdmin.from('clients').insert({
            user_id: null,
            name: client_name,
            phone: cleanPhone,
            email: client_email || null
          });
        }
      } else {
        // Client booking: validate phone ownership
        if (clientRecord && clientRecord.phone !== cleanPhone) {
          return new Response(
            JSON.stringify({ error: 'O número de telefone não corresponde à sua conta' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create or associate client record
        if (!clientRecord) {
          const { data: existingPhone } = await supabaseAdmin
            .from('clients')
            .select('id, user_id')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existingPhone?.user_id && existingPhone.user_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Este número de telefone já está registado' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (existingPhone && !existingPhone.user_id) {
            await supabaseAdmin.from('clients')
              .update({ user_id: user.id, name: client_name, email: client_email || null })
              .eq('id', existingPhone.id);
          } else if (!existingPhone) {
            await supabaseAdmin.from('clients').insert({
              user_id: user.id,
              name: client_name,
              phone: cleanPhone,
              email: client_email || null
            });
          }
        }
      }

      // Check for conflicts - filter by same professional
      const { data: existingBookings } = await supabaseAdmin.rpc('get_booked_slots', { 
        p_booking_date: booking_date,
        p_admin_id: responsible_admin_id || null
      });
      if (existingBookings && existingBookings.length > 0) {
        const startMinutes = timeToMinutes(start_time);
        const endMinutes = timeToMinutes(end_time);
        
        const hasConflict = existingBookings.some((slot: any) => {
          const existingStart = timeToMinutes(slot.start_time.substring(0, 5));
          const existingEnd = timeToMinutes(slot.end_time.substring(0, 5));
          return startMinutes < existingEnd && endMinutes > existingStart;
        });

        if (hasConflict) {
          return new Response(
            JSON.stringify({ error: 'Este horário sobrepõe uma marcação já existente' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create booking with responsible_admin_id
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .insert({
          service_name,
          service_duration,
          booking_date,
          start_time,
          end_time,
          client_name,
          client_phone: cleanPhone,
          client_email: client_email || null,
          responsible_admin_id: responsible_admin_id || null
        })
        .select('*')
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar marcação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Booking created:', booking.id);

      // Trigger notifications (non-blocking)
      triggerCreateNotifications(supabaseUrl, supabaseServiceKey, {
        bookingId: booking.id,
        serviceName: service_name,
        serviceDuration: service_duration,
        bookingDate: booking_date,
        startTime: start_time,
        endTime: end_time,
        clientName: client_name,
        clientPhone: cleanPhone,
        clientEmail: client_email || undefined,
      });

      return new Response(
        JSON.stringify({ success: true, booking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: CANCEL
    // ============================================
    if (action === "cancel") {
      if (!booking_id) {
        return new Response(
          JSON.stringify({ error: 'booking_id é obrigatório para cancelamento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get booking
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', booking_id)
        .single();

      if (fetchError || !booking) {
        return new Response(
          JSON.stringify({ error: 'Marcação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Permission check: client can only cancel their own bookings
      if (!isAdmin) {
        const cleanClientPhone = clientRecord?.phone?.replace(/\s/g, '');
        const cleanBookingPhone = booking.client_phone?.replace(/\s/g, '');
        if (cleanClientPhone !== cleanBookingPhone) {
          return new Response(
            JSON.stringify({ error: 'Sem permissão para cancelar esta marcação' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 24h rule check for clients
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        const minCancelTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        if (bookingDateTime < minCancelTime) {
          return new Response(
            JSON.stringify({ error: 'Cancelamento não permitido a menos de 24h do serviço' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Cancel booking
      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error cancelling booking:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao cancelar marcação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Booking cancelled:', booking_id);

      // Trigger notifications (non-blocking)
      triggerCancelNotifications(supabaseUrl, supabaseServiceKey, {
        bookingId: booking.id,
        serviceName: booking.service_name,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        clientName: booking.client_name,
        clientPhone: booking.client_phone,
        clientEmail: booking.client_email,
        cancelledByAdmin: isAdmin,
      });

      return new Response(
        JSON.stringify({ success: true, booking: updatedBooking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: RESCHEDULE
    // ============================================
    if (action === "reschedule") {
      if (!booking_id) {
        return new Response(
          JSON.stringify({ error: 'booking_id é obrigatório para reagendamento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { new_date, new_start_time, new_end_time } = payload;

      if (!new_date || !new_start_time || !new_end_time) {
        return new Response(
          JSON.stringify({ error: 'new_date, new_start_time e new_end_time são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get booking
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', booking_id)
        .single();

      if (fetchError || !booking) {
        return new Response(
          JSON.stringify({ error: 'Marcação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Permission check: client can only reschedule their own bookings
      if (!isAdmin) {
        const cleanClientPhone = clientRecord?.phone?.replace(/\s/g, '');
        const cleanBookingPhone = booking.client_phone?.replace(/\s/g, '');
        if (cleanClientPhone !== cleanBookingPhone) {
          return new Response(
            JSON.stringify({ error: 'Sem permissão para reagendar esta marcação' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 24h rule check for clients (against original booking time)
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        const minRescheduleTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        if (bookingDateTime < minRescheduleTime) {
          return new Response(
            JSON.stringify({ error: 'Reagendamento não permitido a menos de 24h do serviço original' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Also check new date is at least 24h away
        const newDateTime = new Date(`${new_date}T${new_start_time}`);
        if (newDateTime < minRescheduleTime) {
          return new Response(
            JSON.stringify({ error: 'A nova data deve ser pelo menos 24h no futuro' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check for conflicts on new date (excluding current booking) - filter by same professional
      const { data: existingBookings } = await supabaseAdmin.rpc('get_booked_slots', { 
        p_booking_date: new_date,
        p_admin_id: booking.responsible_admin_id || null
      });
      if (existingBookings && existingBookings.length > 0) {
        const startMinutes = timeToMinutes(new_start_time);
        const endMinutes = timeToMinutes(new_end_time);
        
        const hasConflict = existingBookings.some((slot: any) => {
          // Skip if this is the same time as the original booking being rescheduled
          if (booking.booking_date === new_date && 
              slot.start_time === booking.start_time && 
              slot.end_time === booking.end_time) {
            return false;
          }
          const existingStart = timeToMinutes(slot.start_time.substring(0, 5));
          const existingEnd = timeToMinutes(slot.end_time.substring(0, 5));
          return startMinutes < existingEnd && endMinutes > existingStart;
        });

        if (hasConflict) {
          return new Response(
            JSON.stringify({ error: 'O novo horário sobrepõe uma marcação já existente' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Store old values for notification
      const oldDate = booking.booking_date;
      const oldStartTime = booking.start_time;

      // Update booking
      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          booking_date: new_date,
          start_time: new_start_time,
          end_time: new_end_time,
        })
        .eq('id', booking_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error rescheduling booking:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao reagendar marcação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Booking rescheduled:', booking_id);

      // Trigger notifications (non-blocking)
      triggerRescheduleNotifications(supabaseUrl, supabaseServiceKey, {
        bookingId: booking.id,
        serviceName: booking.service_name,
        oldDate,
        oldStartTime,
        newDate: new_date,
        newStartTime: new_start_time,
        clientName: booking.client_name,
        clientPhone: booking.client_phone,
        clientEmail: booking.client_email,
      });

      return new Response(
        JSON.stringify({ success: true, booking: updatedBooking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: UPDATE_CLIENT_INFO (Admin only)
    // ============================================
    if (action === "update_client_info") {
      if (!booking_id) {
        return new Response(
          JSON.stringify({ error: 'booking_id é obrigatório para atualização' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Only admins can update client info
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Apenas administradores podem editar dados de cliente' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { client_name, client_phone, client_email } = payload;

      if (!client_name || !client_phone) {
        return new Response(
          JSON.stringify({ error: 'Nome e telefone são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get booking
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', booking_id)
        .single();

      if (fetchError || !booking) {
        return new Response(
          JSON.stringify({ error: 'Marcação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update booking client info
      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          client_name: client_name.trim(),
          client_phone: client_phone.trim(),
          client_email: client_email?.trim() || null
        })
        .eq('id', booking_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating booking client info:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar dados do cliente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Booking client info updated:', booking_id);

      return new Response(
        JSON.stringify({ success: true, booking: updatedBooking }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// NON-BLOCKING NOTIFICATION TRIGGERS
// ============================================

async function triggerCreateNotifications(
  supabaseUrl: string,
  serviceKey: string,
  data: {
    bookingId: string;
    serviceName: string;
    serviceDuration: number;
    bookingDate: string;
    startTime: string;
    endTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
  }
) {
  try {
    // Call send-booking-notification
    await fetch(`${supabaseUrl}/functions/v1/send-booking-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        serviceName: data.serviceName,
        servicePrice: "Ver detalhes",
        serviceDuration: formatDuration(data.serviceDuration),
        date: formatDate(data.bookingDate),
        time: data.startTime,
        endTime: data.endTime,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        bookingId: data.bookingId,
      }),
    });
    console.log("Create notifications triggered");
  } catch (e) {
    console.error("Error triggering create notifications:", e);
  }
}

async function triggerCancelNotifications(
  supabaseUrl: string,
  serviceKey: string,
  data: {
    bookingId: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    cancelledByAdmin: boolean;
  }
) {
  try {
    // Call send-cancellation-notification
    await fetch(`${supabaseUrl}/functions/v1/send-cancellation-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        bookingId: data.bookingId,
        serviceName: data.serviceName,
        bookingDate: data.bookingDate,
        startTime: data.startTime.substring(0, 5),
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
      }),
    });
    console.log("Cancel notifications triggered");
  } catch (e) {
    console.error("Error triggering cancel notifications:", e);
  }
}

async function triggerRescheduleNotifications(
  supabaseUrl: string,
  serviceKey: string,
  data: {
    bookingId: string;
    serviceName: string;
    oldDate: string;
    oldStartTime: string;
    newDate: string;
    newStartTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
  }
) {
  const supabase = createClient(supabaseUrl, serviceKey);
  
  try {
    // Create in-app notification for client
    await supabase.from("notifications").insert({
      title: "Marcação Reagendada",
      message: `A sua marcação de ${data.serviceName} foi alterada de ${formatDate(data.oldDate)} às ${data.oldStartTime.substring(0, 5)} para ${formatDate(data.newDate)} às ${data.newStartTime.substring(0, 5)}.`,
      type: "reschedule",
      client_phone: data.clientPhone,
      related_booking_id: data.bookingId,
    });

    // Send push notification to client
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        client_phone: data.clientPhone,
        payload: {
          title: "Marcação Reagendada",
          body: `A sua marcação de ${data.serviceName} foi alterada para ${formatDate(data.newDate)} às ${data.newStartTime.substring(0, 5)}.`,
          url: "/minha-conta/marcacoes",
          tag: `reschedule-${data.bookingId}`,
        },
      }),
    });

    console.log("Reschedule notifications triggered");
  } catch (e) {
    console.error("Error triggering reschedule notifications:", e);
  }
}
