-- Seed de categorias, profissões e prestadores fake
-- Idempotente: pode ser reexecutado com segurança

-- Alinhar sequências/identities para evitar colisões de PK quando já existirem
-- linhas inseridas manualmente em migrations anteriores.
DO $$
DECLARE
  v_seq TEXT;
BEGIN
  SELECT pg_get_serial_sequence('public.service_categories', 'id') INTO v_seq;
  IF v_seq IS NOT NULL THEN
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM public.service_categories), 0) + 1, false)',
      v_seq
    );
  END IF;

  SELECT pg_get_serial_sequence('public.professions', 'id') INTO v_seq;
  IF v_seq IS NOT NULL THEN
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM public.professions), 0) + 1, false)',
      v_seq
    );
  END IF;

  SELECT pg_get_serial_sequence('public.users', 'id') INTO v_seq;
  IF v_seq IS NOT NULL THEN
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(id) FROM public.users), 0) + 1, false)',
      v_seq
    );
  END IF;
END
$$;

-- 1) Categorias essenciais
WITH cats AS (
  SELECT * FROM (VALUES
    ('Beleza'), ('Saúde'), ('Família'), ('Educação'),
    ('Tecnologia'), ('Reparos'), ('Limpeza'), ('Jardinagem'),
    ('Pets'), ('Automotivo'), ('Transporte')
  ) AS v(name)
)
INSERT INTO service_categories(name)
SELECT c.name FROM cats c
WHERE NOT EXISTS (SELECT 1 FROM service_categories sc WHERE sc.name = c.name);

-- 2) Profissões usadas pelos seeds
WITH profs AS (
  SELECT * FROM (VALUES
    ('Barbeiro','Beleza'),
    ('Cabeleireiro','Beleza'),
    ('Esteticista','Beleza'),
    ('Bronzeamento','Beleza'),
    ('Manicure/Pedicure','Beleza'),
    ('Massoterapeuta','Beleza'),
    ('Enfermeiro(a)','Saúde'),
    ('Fisioterapeuta','Saúde'),
    ('Nutricionista','Saúde'),
    ('Psicólogo(a)','Saúde'),
    ('Personal Trainer','Saúde'),
    ('Pedreiro','Reparos'),
    ('Pintor','Reparos'),
    ('Eletricista','Reparos'),
    ('Encanador','Reparos'),
    ('Montador de Móveis','Reparos'),
    ('Borracheiro','Automotivo'),
    ('Mecânico Automotivo','Automotivo'),
    ('Lavagem Automotiva','Automotivo'),
    ('Motoboy/Entrega','Transporte'),
    ('Motorista Particular','Transporte')
  ) AS v(name, category_name)
),
cat_ids AS (
  SELECT sc.id, sc.name FROM service_categories sc
),
ins_profs AS (
  INSERT INTO professions(name, category_id)
  SELECT p.name, c.id
  FROM profs p
  LEFT JOIN cat_ids c ON c.name = p.category_name
  ON CONFLICT (name) DO NOTHING
  RETURNING id, name
)
SELECT 1;

-- 3) Prestadores fake
WITH data AS (
  SELECT * FROM (VALUES
    -- Beleza
    ('contato@salonaurora.com',   'Salão Aurora',            '+55 11 99999-0001', 'Salão Aurora',            'Av. Central, 100, São Paulo',     -23.5610, -46.6550, ARRAY['Cabeleireiro','Manicure/Pedicure','Esteticista','Massoterapeuta']),
    ('agora@barbeariacentral.com','Barbearia Central',       '+55 11 99999-0002', 'Barbearia Central',       'Rua das Palmeiras, 45, São Paulo', -23.5675, -46.6480, ARRAY['Barbeiro']),
    ('bronze@studiospa.com',      'Studio Bronze & Spa',     '+55 21 98888-0003', 'Studio Bronze & Spa',     'Av. Atlântica, 3200, Rio',        -22.9710, -43.1830, ARRAY['Bronzeamento','Esteticista','Massoterapeuta']),
    ('oi@belavida.com',           'Esmalteria Bela Vida',    '+55 31 97777-0004', 'Esmalteria Bela Vida',    'Rua da Bahia, 800, Belo Horizonte', -19.9250, -43.9370, ARRAY['Manicure/Pedicure']),
    -- Saúde
    ('contato@vidaplena.com',     'Clínica Vida Plena',      '+55 11 95555-0005', 'Clínica Vida Plena',      'Al. Saúde, 200, São Paulo',       -23.5810, -46.6400, ARRAY['Enfermeiro(a)','Fisioterapeuta','Nutricionista','Personal Trainer']),
    ('ana@psilima.com',           'Psicóloga Ana Lima',      '+55 41 96666-0006', 'Consultório Ana Lima',    'Rua XV, 1234, Curitiba',          -25.4290, -49.2700, ARRAY['Psicólogo(a)']),
    -- Reparos / Construção
    ('joao@obraspro.com',         'João Obras',              '+55 11 98888-0007', 'Pedreiro João Obras',     'Rua Tijolo, 50, São Paulo',       -23.6000, -46.6500, ARRAY['Pedreiro','Pintor']),
    ('contato@construservice.com','Construservice Total',    '+55 21 97777-0008', 'Construservice Total',    'Av. Brasil, 5000, Rio',           -22.8750, -43.3750, ARRAY['Pedreiro','Encanador','Eletricista','Montador de Móveis']),
    -- Automotivo
    ('suporte@borracheiro24.com', 'Borracheiro 24h',         '+55 31 95555-0009', 'Borracheiro 24h',         'BR-381, km 512, Contagem',        -19.9130, -44.0310, ARRAY['Borracheiro','Mecânico Automotivo']),
    ('contato@autocenterrapido.com','Auto Center Rápido',    '+55 41 94444-0010', 'Auto Center Rápido',      'Av. das Torres, 900, Curitiba',   -25.4700, -49.1800, ARRAY['Mecânico Automotivo','Lavagem Automotiva']),
    -- Serviços gerais / transporte
    ('suporte@handyman.com',      'Handyman Express',        '+55 61 93333-0011', 'Handyman Express',        'SCLN 201, Brasília',              -15.7890, -47.8830, ARRAY['Eletricista','Encanador','Montador de Móveis']),
    ('agenda@donafaxina.com',     'Dona Faxina Serviços',    '+55 11 97777-0012', 'Dona Faxina Serviços',    'Rua Limpeza, 10, São Paulo',      -23.5615, -46.6405, ARRAY['Diarista','Faxineiro(a)']),
    ('entregas@motoboytop.com',   'Motoboy Top',             '+55 11 95555-0013', 'Motoboy Top',             'Av. Paulista, 1500, São Paulo',   -23.5618, -46.6560, ARRAY['Motoboy/Entrega','Motorista Particular'])
  ) AS v(email, full_name, phone, commercial_name, address, lat, lng, profs)
),
ins_users AS (
  INSERT INTO users (email, full_name, phone, role, is_verified)
  SELECT email, full_name, phone, 'provider', TRUE FROM data
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = 'provider',
        is_verified = TRUE
  RETURNING id, email
),
ins_providers AS (
  INSERT INTO providers (user_id, commercial_name, address, latitude, longitude, is_online, wallet_balance)
  SELECT u.id, d.commercial_name, d.address, d.lat, d.lng, TRUE, 0.0
  FROM data d
  JOIN ins_users u USING (email)
  ON CONFLICT (user_id) DO UPDATE
    SET commercial_name = EXCLUDED.commercial_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_online = TRUE
  RETURNING user_id
)
INSERT INTO provider_professions (provider_user_id, profession_id)
SELECT u.id, p.id
FROM data d
JOIN ins_users u USING (email)
CROSS JOIN LATERAL unnest(d.profs) AS prof_name
JOIN professions p ON p.name = prof_name
ON CONFLICT (provider_user_id, profession_id) DO NOTHING;
