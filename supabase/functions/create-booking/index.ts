import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no auth header' }),
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is an admin
    const { data: isAdminResult } = await supabaseAdmin
      .rpc('is_admin', { _user_id: user.id });
    
    const isAdmin = isAdminResult === true;
    console.log('User is admin:', isAdmin);

    // Parse request body
    const body = await req.json();
    const { 
      service_name, 
      service_duration, 
      booking_date, 
      start_time, 
      end_time,
      client_name,
      client_phone,
      client_email,
      is_admin_booking
    } = body;

    // Validate required fields
    if (!service_name || !service_duration || !booking_date || !start_time || !end_time || !client_name || !client_phone) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number
    const cleanPhone = client_phone.replace(/\s/g, '');

    // Different validation paths for admin vs client bookings
    if (isAdmin && is_admin_booking) {
      // ADMIN BOOKING: Find or create client without user_id validation
      console.log('Processing admin booking for phone:', cleanPhone);

      // Check if client exists by phone
      const { data: existingClient, error: clientSearchError } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone, email')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (clientSearchError) {
        console.error('Error searching client:', clientSearchError);
        return new Response(
          JSON.stringify({ error: 'Error searching client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If client doesn't exist, create one without user_id (offline client)
      if (!existingClient) {
        const { error: createClientError } = await supabaseAdmin
          .from('clients')
          .insert({
            user_id: null, // Offline client - no user account
            name: client_name,
            phone: cleanPhone,
            email: client_email || null
          });

        if (createClientError) {
          console.error('Error creating offline client:', createClientError);
          return new Response(
            JSON.stringify({ error: 'Error creating client record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('Created new offline client for phone:', cleanPhone);
      } else {
        console.log('Using existing client:', existingClient.id);
      }

    } else {
      // CLIENT BOOKING: Verify the phone belongs to the authenticated user
      const { data: clientRecord, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, phone, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client record:', clientError);
        return new Response(
          JSON.stringify({ error: 'Error validating client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If client record exists, verify the phone matches
      if (clientRecord && clientRecord.phone !== cleanPhone) {
        console.error('Phone mismatch: user phone', clientRecord.phone, 'vs provided', cleanPhone);
        return new Response(
          JSON.stringify({ error: 'O número de telefone não corresponde à sua conta' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If no client record exists, create one
      if (!clientRecord) {
        // Check if phone is already used by another user
        const { data: existingPhone } = await supabaseAdmin
          .from('clients')
          .select('id, user_id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingPhone && existingPhone.user_id) {
          console.error('Phone already registered to another user');
          return new Response(
            JSON.stringify({ error: 'Este número de telefone já está registado' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If phone exists but has no user_id (offline client), associate it
        if (existingPhone && !existingPhone.user_id) {
          const { error: updateClientError } = await supabaseAdmin
            .from('clients')
            .update({ user_id: user.id, name: client_name, email: client_email || null })
            .eq('id', existingPhone.id);

          if (updateClientError) {
            console.error('Error associating client:', updateClientError);
          } else {
            console.log('Associated offline client with user:', user.id);
          }
        } else {
          // Create new client record
          const { error: createClientError } = await supabaseAdmin
            .from('clients')
            .insert({
              user_id: user.id,
              name: client_name,
              phone: cleanPhone,
              email: client_email || null
            });

          if (createClientError) {
            console.error('Error creating client:', createClientError);
            return new Response(
              JSON.stringify({ error: 'Error creating client record' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.log('Created new client record for user:', user.id);
        }
      }
    }

    // Check for booking conflicts
    const { data: existingBookings, error: conflictError } = await supabaseAdmin
      .rpc('get_booked_slots', { booking_date });

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
    } else if (existingBookings && existingBookings.length > 0) {
      const startMinutes = timeToMinutes(start_time);
      const endMinutes = timeToMinutes(end_time);
      
      const hasConflict = existingBookings.some((slot: any) => {
        const existingStart = timeToMinutes(slot.start_time.substring(0, 5));
        const existingEnd = timeToMinutes(slot.end_time.substring(0, 5));
        return startMinutes < existingEnd && endMinutes > existingStart;
      });

      if (hasConflict) {
        console.error('Booking conflict detected');
        return new Response(
          JSON.stringify({ error: 'Este horário sobrepõe uma marcação já existente' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create the booking
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
        client_email: client_email || null
      })
      .select('id')
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar marcação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Booking created successfully:', booking.id);

    return new Response(
      JSON.stringify({ success: true, bookingId: booking.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}