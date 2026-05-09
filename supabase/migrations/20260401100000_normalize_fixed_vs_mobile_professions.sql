-- Normalize fixed vs mobile providers.
-- "Fixo" (at_provider): cliente vai até o prestador (normalmente com agenda).
-- "Móvel" (on_site): prestador vai até o cliente/carro/parado no local (solicitar agora).

-- 1) Serviços móveis (estrada / emergência)
UPDATE public.professions
SET service_type = 'on_site'
WHERE lower(name) IN (
  'borracheiro',
  'mecânico',
  'mecanico',
  'mecânico (serviços rápidos)',
  'mecanico (serviços rápidos)',
  'guincheiro',
  'chaveiro'
);

-- 2) Serviços fixos (salão/estética) - agenda
UPDATE public.professions
SET service_type = 'at_provider'
WHERE lower(name) IN (
  'barbeiro masculino',
  'barbeiro',
  'cabeleireiro (unissex)',
  'manicure / pedicure',
  'maquiadora',
  'maquiadora profissional',
  'esteticista (limpeza de pele)',
  'esteticista',
  'depiladora',
  'designer de sobrancelhas',
  'massageador',
  'podóloga',
  'podologa',
  'pet shop'
);

