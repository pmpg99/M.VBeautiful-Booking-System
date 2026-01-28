-- Create date_exceptions table for unblocking recurring days off
CREATE TABLE public.date_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_date DATE NOT NULL,
  reason TEXT,
  service_category TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.date_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view date exceptions"
ON public.date_exceptions
FOR SELECT
USING (true);

CREATE POLICY "Admins can create date exceptions"
ON public.date_exceptions
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update date exceptions"
ON public.date_exceptions
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete date exceptions"
ON public.date_exceptions
FOR DELETE
USING (is_admin(auth.uid()));