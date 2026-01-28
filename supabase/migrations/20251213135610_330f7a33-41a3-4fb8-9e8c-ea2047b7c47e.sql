-- Drop the overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

-- Notifications should only be created by admins (edge functions bypass RLS with service_role)
CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- For business_settings and blocked_times: these are intentionally public for the booking calendar
-- Adding comments to document this decision
COMMENT ON TABLE public.business_settings IS 'Business configuration - intentionally public for booking calendar availability display';
COMMENT ON TABLE public.blocked_times IS 'Blocked time slots - intentionally public for booking calendar availability display';