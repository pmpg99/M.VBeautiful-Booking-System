-- Drop the view with security definer issue
DROP VIEW IF EXISTS public.public_services;

-- Recreate without security definer (uses invoker's permissions by default)
CREATE VIEW public.public_services 
WITH (security_invoker = true) AS
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