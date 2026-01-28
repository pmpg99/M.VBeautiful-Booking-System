-- Add responsible_admin_id column to services table
-- This maps each service to a specific admin (M.vbadmin or Jo.Visage)
ALTER TABLE public.services 
ADD COLUMN responsible_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_services_responsible_admin ON public.services(responsible_admin_id);

-- Add comment for clarity
COMMENT ON COLUMN public.services.responsible_admin_id IS 'The admin user responsible for this service - their Google Calendar will receive booking events';