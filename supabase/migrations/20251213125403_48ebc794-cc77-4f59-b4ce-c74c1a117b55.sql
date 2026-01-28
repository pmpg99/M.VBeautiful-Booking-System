-- Allow full_admin users to view profiles of other admin users
CREATE POLICY "Full admins can view admin profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'full_admin'::admin_role)
  AND
  is_admin(id)
);