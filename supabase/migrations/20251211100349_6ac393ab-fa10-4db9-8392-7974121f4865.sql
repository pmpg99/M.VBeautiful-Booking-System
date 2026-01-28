-- Drop the existing public SELECT policy on bookings
DROP POLICY IF EXISTS "Anyone can view bookings for availability check" ON public.bookings;

-- Create policy for admins to view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (is_admin(auth.uid()));

-- Create policy for clients to view their own bookings by phone
CREATE POLICY "Clients can view their own bookings"
ON public.bookings
FOR SELECT
USING (
  client_phone IN (
    SELECT phone FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Create a secure function to check availability (returns only time slots, no PII)
CREATE OR REPLACE FUNCTION public.get_booked_slots(booking_date date)
RETURNS TABLE (
  start_time time without time zone,
  end_time time without time zone,
  service_duration integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.start_time, b.end_time, b.service_duration
  FROM public.bookings b
  WHERE b.booking_date = $1;
$$;