-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_phone TEXT, -- For clients without account, identify by phone
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'booking', -- booking, reminder, cancellation
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all notifications (for professional notifications)
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert notifications (for system-generated notifications)
CREATE POLICY "Anyone can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Admins can update notifications
CREATE POLICY "Admins can update notifications"
ON public.notifications
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
USING (is_admin(auth.uid()));

-- Create clients table for client accounts
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clients can view their own data
CREATE POLICY "Clients can view their own data"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- Clients can update their own data
CREATE POLICY "Clients can update their own data"
ON public.clients
FOR UPDATE
USING (auth.uid() = user_id);

-- Anyone can create a client (during signup)
CREATE POLICY "Anyone can create clients"
ON public.clients
FOR INSERT
WITH CHECK (true);

-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add email field to bookings for client association
ALTER TABLE public.bookings ADD COLUMN client_email TEXT;

-- Clients can view their own notifications by phone
CREATE POLICY "Clients can view notifications by phone"
ON public.notifications
FOR SELECT
USING (
  client_phone IN (
    SELECT phone FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Clients can update their own notifications (mark as read)
CREATE POLICY "Clients can update their notifications"
ON public.notifications
FOR UPDATE
USING (
  client_phone IN (
    SELECT phone FROM public.clients WHERE user_id = auth.uid()
  )
);