-- Drop the current public INSERT policy
DROP POLICY IF EXISTS "Anyone can create clients" ON public.clients;

-- Create policy for admins to insert any client
CREATE POLICY "Admins can create clients"
ON public.clients
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create policy for authenticated users to create their own client record
CREATE POLICY "Authenticated users can create their own client record"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());