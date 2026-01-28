-- Add DELETE policy for bookings (admins only)
CREATE POLICY "Admins can delete bookings"
ON public.bookings
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Add UPDATE policy for bookings (admins only)
CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
USING (public.is_admin(auth.uid()));