-- Create service categories table (main menus)
CREATE TABLE public.service_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table (sub-services)
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view active service categories"
ON public.service_categories
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all service categories"
ON public.service_categories
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create service categories"
ON public.service_categories
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update service categories"
ON public.service_categories
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete service categories"
ON public.service_categories
FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies for services
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create services"
ON public.services
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_services_category_id ON public.services(category_id);
CREATE INDEX idx_services_is_active ON public.services(is_active);
CREATE INDEX idx_service_categories_is_active ON public.service_categories(is_active);

-- Add triggers for updated_at
CREATE TRIGGER update_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data from existing services
INSERT INTO public.service_categories (name, slug, display_order) VALUES
('Nail''s', 'nails', 1),
('Epilação a Linha', 'epilacao-linha', 2),
('Maquilhagem', 'maquilhagem', 3),
('Depilação a Laser - Mulher', 'laser-mulher', 4),
('Depilação a Laser - Homem', 'laser-homem', 5),
('Pestanas', 'pestanas', 6);

-- Insert services for Nail's category
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order) 
SELECT id, 'Manutenção Gel', 35.00, 120, 1 FROM public.service_categories WHERE slug = 'nails'
UNION ALL
SELECT id, 'Gelinho', 25.00, 90, 2 FROM public.service_categories WHERE slug = 'nails'
UNION ALL
SELECT id, 'Remoção', 10.00, 30, 3 FROM public.service_categories WHERE slug = 'nails'
UNION ALL
SELECT id, 'Manicure Simples', 12.00, 30, 4 FROM public.service_categories WHERE slug = 'nails'
UNION ALL
SELECT id, 'Manicure com Verniz Gel', 18.00, 45, 5 FROM public.service_categories WHERE slug = 'nails';

-- Insert services for Epilação a Linha
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order)
SELECT id, 'Sobrancelhas', 5.00, 15, 1 FROM public.service_categories WHERE slug = 'epilacao-linha'
UNION ALL
SELECT id, 'Buço', 3.00, 10, 2 FROM public.service_categories WHERE slug = 'epilacao-linha'
UNION ALL
SELECT id, 'Sobrancelhas + Buço', 7.00, 20, 3 FROM public.service_categories WHERE slug = 'epilacao-linha';

-- Insert services for Maquilhagem
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order)
SELECT id, 'Maquilhagem Social', 25.00, 30, 1 FROM public.service_categories WHERE slug = 'maquilhagem'
UNION ALL
SELECT id, 'Maquilhagem Noiva', 50.00, 60, 2 FROM public.service_categories WHERE slug = 'maquilhagem';

-- Insert services for Laser Mulher
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order)
SELECT id, 'Axilas', 15.00, 30, 1 FROM public.service_categories WHERE slug = 'laser-mulher'
UNION ALL
SELECT id, 'Virilhas', 20.00, 30, 2 FROM public.service_categories WHERE slug = 'laser-mulher'
UNION ALL
SELECT id, 'Pernas Completas', 60.00, 60, 3 FROM public.service_categories WHERE slug = 'laser-mulher'
UNION ALL
SELECT id, 'Pack Mulher Completo', 120.00, 90, 4 FROM public.service_categories WHERE slug = 'laser-mulher';

-- Insert services for Laser Homem
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order)
SELECT id, 'Costas', 40.00, 45, 1 FROM public.service_categories WHERE slug = 'laser-homem'
UNION ALL
SELECT id, 'Peito', 35.00, 40, 2 FROM public.service_categories WHERE slug = 'laser-homem'
UNION ALL
SELECT id, 'Pack Homem Completo', 100.00, 90, 3 FROM public.service_categories WHERE slug = 'laser-homem';

-- Insert services for Pestanas
INSERT INTO public.services (category_id, name, price, duration_minutes, display_order)
SELECT id, 'Extensões Clássicas', 45.00, 90, 1 FROM public.service_categories WHERE slug = 'pestanas'
UNION ALL
SELECT id, 'Extensões Volume', 55.00, 120, 2 FROM public.service_categories WHERE slug = 'pestanas'
UNION ALL
SELECT id, 'Lifting de Pestanas', 35.00, 60, 3 FROM public.service_categories WHERE slug = 'pestanas'
UNION ALL
SELECT id, 'Manutenção Extensões', 30.00, 60, 4 FROM public.service_categories WHERE slug = 'pestanas';