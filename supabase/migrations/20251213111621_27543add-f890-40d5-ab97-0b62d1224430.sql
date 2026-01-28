
-- 1. Create the unified "Depilação a Laser" category
INSERT INTO service_categories (name, slug, display_order, is_active)
VALUES ('Depilação a Laser', 'depilacao-a-laser', 4, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- Get the new category ID for reference
DO $$
DECLARE
  new_category_id uuid;
  ela_service_id uuid;
  ele_service_id uuid;
BEGIN
  -- Get or create the unified category
  SELECT id INTO new_category_id FROM service_categories WHERE slug = 'depilacao-a-laser';
  
  IF new_category_id IS NULL THEN
    INSERT INTO service_categories (name, slug, display_order, is_active)
    VALUES ('Depilação a Laser', 'depilacao-a-laser', 4, true)
    RETURNING id INTO new_category_id;
  END IF;

  -- 2. Create Level 2 services: "Laser para ELA" and "Laser para ELE"
  INSERT INTO services (category_id, name, price, duration_minutes, description, has_options, display_order, is_active)
  VALUES (new_category_id, 'Laser para ELA', 0, 30, 'Serviços de depilação a laser para mulher', true, 1, true)
  RETURNING id INTO ela_service_id;
  
  INSERT INTO services (category_id, name, price, duration_minutes, description, has_options, display_order, is_active)
  VALUES (new_category_id, 'Laser para ELE', 0, 30, 'Serviços de depilação a laser para homem', true, 2, true)
  RETURNING id INTO ele_service_id;

  -- 3. Migrate "Mulher" services to Level 3 (service_options) under "Laser para ELA"
  INSERT INTO service_options (service_id, name, price, duration_minutes, description, display_order, is_active)
  SELECT ela_service_id, s.name, s.price, s.duration_minutes, s.description, s.display_order, s.is_active
  FROM services s
  JOIN service_categories sc ON s.category_id = sc.id
  WHERE sc.slug = 'laser-mulher' AND s.name != 'Laser para ELA';

  -- 4. Migrate "Homem" services to Level 3 (service_options) under "Laser para ELE"
  INSERT INTO service_options (service_id, name, price, duration_minutes, description, display_order, is_active)
  SELECT ele_service_id, s.name, s.price, s.duration_minutes, s.description, s.display_order, s.is_active
  FROM services s
  JOIN service_categories sc ON s.category_id = sc.id
  WHERE sc.slug = 'laser-homem';

  -- 5. Delete old services from the split categories
  DELETE FROM services WHERE category_id IN (
    SELECT id FROM service_categories WHERE slug IN ('laser-mulher', 'laser-homem')
  );

  -- 6. Delete the old split categories
  DELETE FROM service_categories WHERE slug IN ('laser-mulher', 'laser-homem');
END $$;
