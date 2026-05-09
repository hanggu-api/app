-- Set test accounts location to Imperatriz/MA near FACIMP rotatória (for dispatch tests).
-- Coordinates from OSM Nominatim (FACIMP - Faculdade de Imperatriz): -5.5122656, -47.4485130

DO $$
DECLARE
  v_lat double precision := -5.5122656;
  v_lon double precision := -47.4485130;
  v_addr text := 'FACIMP - Faculdade de Imperatriz (Rotatória), Rua Prociom, Bom Jesus, Imperatriz - MA';
BEGIN
  -- Update provider profiles (only affects accounts that have a row in `providers`)
  UPDATE public.providers p
  SET
    latitude = v_lat,
    longitude = v_lon,
    address = v_addr
  FROM public.users u
  WHERE u.id = p.user_id
    AND lower(u.email) IN ('carrobomebarato@gmail.com', 'passageiro2@gmail.com');
END $$;

