-- Add responsible_admin_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN responsible_admin_id uuid NULL;

-- Create index for faster queries filtering by admin and date
CREATE INDEX idx_bookings_admin_date ON public.bookings(responsible_admin_id, booking_date);

-- Drop existing RPC functions to recreate with new signature
DROP FUNCTION IF EXISTS public.get_booked_slots(text);
DROP FUNCTION IF EXISTS public.get_booked_slots(date);

-- Create new function that filters by responsible_admin_id
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_booking_date date,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE(
  start_time text,
  end_time text,
  service_duration integer
)
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
  WHERE b.booking_date = p_booking_date
    AND (b.status IS NULL OR b.status != 'cancelled')
    AND (p_admin_id IS NULL OR b.responsible_admin_id = p_admin_id);
END;
$$;