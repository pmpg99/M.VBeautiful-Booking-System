-- Create service_options table (Level 3)
CREATE TABLE public.service_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active service options" 
ON public.service_options 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all service options" 
ON public.service_options 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create service options" 
ON public.service_options 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update service options" 
ON public.service_options 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete service options" 
ON public.service_options 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_service_options_updated_at
BEFORE UPDATE ON public.service_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add flag to services to indicate if it has options (Level 3)
ALTER TABLE public.services ADD COLUMN has_options BOOLEAN NOT NULL DEFAULT false;