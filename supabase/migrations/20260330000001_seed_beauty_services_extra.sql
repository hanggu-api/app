-- Additional Seed: Beauty and Aesthetic Services with realistic BR Prices
-- This script enriches the task_catalog with services that were missing or could be expanded.

DO $$ 
DECLARE 
    prof_id bigint;
BEGIN
    -- 1. DEPILADORA
    SELECT id INTO prof_id FROM public.professions WHERE name = 'Depiladora';
    IF prof_id IS NOT NULL THEN
        INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
        VALUES 
        (prof_id, 'Depilação Meia Perna', 'fixed', 35.00, 'cera; depilar; perna; Duração: 30 min'),
        (prof_id, 'Depilação Perna Inteira', 'fixed', 60.00, 'cera; pernas; Duração: 50 min'),
        (prof_id, 'Depilação Axila', 'fixed', 25.00, 'cera; Duração: 15 min'),
        (prof_id, 'Depilação Buço', 'fixed', 15.00, 'cera; rosto; Duração: 10 min'),
        (prof_id, 'Depilação Íntima (Feminina)', 'fixed', 55.00, 'cera; virilha; Duração: 40 min'),
        (prof_id, 'Depilação Braço', 'fixed', 30.00, 'cera; Duração: 20 min')
        ON CONFLICT (profession_id, name) DO NOTHING;
    END IF;

    -- 2. ESTETICISTA (LIMPEZA DE PELE)
    SELECT id INTO prof_id FROM public.professions WHERE name = 'Esteticista (Limpeza de Pele)';
    IF prof_id IS NOT NULL THEN
        INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
        VALUES 
        (prof_id, 'Limpeza de Pele Profunda', 'fixed', 120.00, 'cravo; espinha; extração; peeling; Duração: 1h 30 min'),
        (prof_id, 'Drenagem Linfática Corporal', 'fixed', 100.00, 'retenção líquidos; massagem; pós-operatório; Duração: 1 hora'),
        (prof_id, 'Massagem Modeladora', 'fixed', 90.00, 'redutora; medidas; Duração: 50 min'),
        (prof_id, 'Peeling de Diamante', 'fixed', 150.00, 'revitalização; manchas; Duração: 45 min'),
        (prof_id, 'Massagem Relaxante', 'fixed', 110.00, 'estresse; bem-estar; Duração: 1 hora')
        ON CONFLICT (profession_id, name) DO NOTHING;
    END IF;

    -- 3. DESIGNER DE SOBRANCELHAS
    SELECT id INTO prof_id FROM public.professions WHERE name = 'Designer de Sobrancelhas';
    IF prof_id IS NOT NULL THEN
        INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
        VALUES 
        (prof_id, 'Design de Sobrancelha (Simples)', 'fixed', 40.00, 'pinça; Duração: 30 min'),
        (prof_id, 'Sobrancelha com Henna', 'fixed', 55.00, 'pintura; preenchimento; Duração: 45 min'),
        (prof_id, 'Brow Lamination', 'fixed', 120.00, 'estilo selvagem; brow; Duração: 1 hora'),
        (prof_id, 'Micropigmentação (Shadow/Fio a Fio)', 'fixed', 450.00, 'maquiagem definitiva; Duração: 2h 30 min'),
        (prof_id, 'Extensão de Cílios (Fio a Fio)', 'fixed', 150.00, 'cílios; olhar; Duração: 2 horas')
        ON CONFLICT (profession_id, name) DO NOTHING;
    END IF;

    -- 4. CABELEIREIRO (UNISSEX) - ADICIONAIS
    SELECT id INTO prof_id FROM public.professions WHERE name = 'Cabeleireiro (Unissex)';
    IF prof_id IS NOT NULL THEN
        INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
        VALUES 
        (prof_id, 'Mechas / Luzes (Cabelo Curto/Médio)', 'fixed', 350.00, 'loira; reflexo; química; Duração: 4 horas'),
        (prof_id, 'Mechas / Luzes (Cabelo Longo)', 'fixed', 500.00, 'loira; reflexo; química; Duração: 6 horas'),
        (prof_id, 'Coloração (Aplicação)', 'fixed', 60.00, 'pintar cabelo; raiz; Duração: 1 hora'),
        (prof_id, 'Selagem Térmica', 'fixed', 180.00, 'redução volume; brilho; Duração: 2 horas'),
        (prof_id, 'Corte Feminino + Escova', 'fixed', 160.00, 'combo; Duração: 1h 30 min')
        ON CONFLICT (profession_id, name) DO NOTHING;
    END IF;

    -- 5. MANICURE / PEDICURE - ADICIONAIS
    SELECT id INTO prof_id FROM public.professions WHERE name = 'Manicure / Pedicure';
    IF prof_id IS NOT NULL THEN
        INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
        VALUES 
        (prof_id, 'Esmaltação em Gel', 'fixed', 50.00, 'durabilidade; brilho; Duração: 40 min'),
        (prof_id, 'Banho de Gel', 'fixed', 80.00, 'proteção unha natural; Duração: 1 hora'),
        (prof_id, 'Blindagem de Unhas', 'fixed', 70.00, 'Duração: 1 hora'),
        (prof_id, 'Spa dos Pés', 'fixed', 60.00, 'esfoliação; relaxamento; Duração: 45 min')
        ON CONFLICT (profession_id, name) DO NOTHING;
    END IF;

END $$;
