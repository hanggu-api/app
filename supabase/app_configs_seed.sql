-- ============================================================
-- Dados iniciais para a tabela app_configs
-- Execute no Editor SQL do Supabase
-- ============================================================

-- Taxa cobrada ao passageiro quando cancela após motorista chegar
INSERT INTO public.app_configs (key, value, description)
VALUES ('cancellation_fee', '{"value": 5.00}', 'Taxa cobrada ao passageiro ao cancelar após motorista chegar (R$)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Comissão do app em % sobre o valor da corrida
INSERT INTO public.app_configs (key, value, description)
VALUES ('app_commission_pct', '{"value": 20}', 'Comissão do app em % sobre o valor da corrida')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Tempo de espera em minutos antes de permitir cancelamento com taxa
INSERT INTO public.app_configs (key, value, description)
VALUES ('wait_time_minutes', '{"value": 2}', 'Minutos de espera gratuita antes de liberar cancelamento com taxa')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Configuração de tributação flexível: model (percentage|fixed)
INSERT INTO public.app_configs (key, value, description)
VALUES ('taxation_config', '{
  "model": "percentage",
  "percentage_value": 15.0,
  "fixed_value": 2.50,
  "additional_fee": 1.00
}', 'Configuração de tributação: model (percentage|fixed), valores e taxa adicional')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Configuração de Tarifa Uber Moto (Imperatriz/Araguaína)
INSERT INTO public.app_configs (key, value, description)
VALUES ('moto_fare_config', '{
  "base_fare": 3.00,
  "per_km": 1.00,
  "per_minute": 0.10,
  "minimum_fare": 5.00
}', 'Configuração de tarifa para Uber Moto: base, km, minuto e mínimo')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
