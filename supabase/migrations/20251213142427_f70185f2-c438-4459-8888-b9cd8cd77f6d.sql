-- Remove the authenticated INSERT policy since bookings should only be created via edge function
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;

-- Create a restrictive policy that only allows service role to insert (edge function uses service role)
CREATE POLICY "Only service role can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (false);

-- Create a public view for services that hides the responsible_admin_id
CREATE OR REPLACE VIEW public.public_services AS
SELECT 
  id,
  name,
  description,
  price,
  duration_minutes,
  category_id,
  has_options,
  display_order,
  is_active,
  created_at,
  updated_at
FROM public.services
WHERE is_active = true;