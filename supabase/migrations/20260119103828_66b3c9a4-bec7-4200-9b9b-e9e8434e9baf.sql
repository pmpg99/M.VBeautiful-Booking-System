-- Fix search_path for get_booked_slots function
CREATE OR REPLACE FUNCTION public.get_booked_slots(booking_date TEXT)
RETURNS TABLE(start_time TEXT, end_time TEXT, service_duration INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.start_time::TEXT,
    b.end_time::TEXT,
    b.service_duration
  FROM public.bookings b
  WHERE b.booking_date = get_booked_slots.booking_date
    AND (b.status IS NULL OR b.status != 'cancelled');
END;
$$;