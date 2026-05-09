-- Set provider location for carrobomebarato@gmail.com near Mix Mateus - Babaçulândia.
-- Coordinates extracted from Google Maps preview payload: lat=-5.5017472, lon=-47.45835915

DO $$
DECLARE
  v_lat double precision := -5.5017472;
  v_lon double precision := -47.45835915;
  v_addr text := 'Mix Mateus - Babaçulândia, Imperatriz - MA (próximo ao Matheus)';
BEGIN
  UPDATE public.providers p
  SET
    latitude = v_lat,
    longitude = v_lon,
    address = v_addr
  FROM public.users u
  WHERE u.id = p.user_id
    AND lower(u.email) = 'carrobomebarato@gmail.com';
END $$;

