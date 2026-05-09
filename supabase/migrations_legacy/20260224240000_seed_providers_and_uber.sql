-- Migration: Seed Test Providers and Uber Drivers (Final Robust Version)
BEGIN;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_barbeiro_masculino_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_masculino_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Barbeiro Masculino Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_masculino_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_masculino_1@example.com', 'Barbeiro Masculino Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_masculino_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_barbeiro_masculino_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Barbeiro Masculino de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.492035861992773, -47.44578133295877, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_barbeiro_masculino_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_masculino_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Barbeiro Masculino Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_masculino_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_masculino_2@example.com', 'Barbeiro Masculino Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_masculino_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_barbeiro_masculino_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Barbeiro Masculino de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.507538541810317, -47.48078396016273, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_barbeiro_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Barbeiro Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_1@example.com', 'Barbeiro Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_barbeiro_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Barbeiro de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.550498552296329, -47.430077653286865, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Barbeiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Barbeiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_barbeiro_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Barbeiro Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_barbeiro_2@example.com', 'Barbeiro Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_barbeiro_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_barbeiro_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Barbeiro de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.543094133004658, -47.44642311468118, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Barbeiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Barbeiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_gesseiro_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_gesseiro_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gesseiro Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_gesseiro_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_gesseiro_1@example.com', 'Gesseiro Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_gesseiro_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_gesseiro_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Gesseiro de teste especializado em serviços de alta qualidade.', '', -5.501577266140028, -47.48216816408762, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_gesseiro_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_gesseiro_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gesseiro Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_gesseiro_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_gesseiro_2@example.com', 'Gesseiro Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_gesseiro_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_gesseiro_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Gesseiro de teste especializado em serviços de alta qualidade.', '', -5.497107738360406, -47.45076207274029, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_carpinteiro_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_carpinteiro_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carpinteiro Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_carpinteiro_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_carpinteiro_1@example.com', 'Carpinteiro Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_carpinteiro_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_carpinteiro_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Carpinteiro de teste especializado em serviços de alta qualidade.', '', -5.4861495474354784, -47.43884922755728, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_carpinteiro_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_carpinteiro_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carpinteiro Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_carpinteiro_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_carpinteiro_2@example.com', 'Carpinteiro Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_carpinteiro_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_carpinteiro_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Carpinteiro de teste especializado em serviços de alta qualidade.', '', -5.510363920287844, -47.42841926450338, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_técnico_de_refrigeração_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_refrigeração_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Técnico de Refrigeração Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_refrigeração_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_refrigeração_1@example.com', 'Técnico de Refrigeração Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_refrigeração_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_técnico_de_refrigeração_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Técnico de Refrigeração de teste especializado em serviços de alta qualidade.', '', -5.525326340775861, -47.482672913591536, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_técnico_de_refrigeração_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_refrigeração_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Técnico de Refrigeração Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_refrigeração_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_refrigeração_2@example.com', 'Técnico de Refrigeração Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_refrigeração_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_técnico_de_refrigeração_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Técnico de Refrigeração de teste especializado em serviços de alta qualidade.', '', -5.527082374553495, -47.42862134008234, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_chaveiro_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_chaveiro_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chaveiro Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_chaveiro_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_chaveiro_1@example.com', 'Chaveiro Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_chaveiro_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_chaveiro_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Chaveiro de teste especializado em serviços de alta qualidade.', '', -5.564387417600098, -47.504489661723156, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_chaveiro_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_chaveiro_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chaveiro Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_chaveiro_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_chaveiro_2@example.com', 'Chaveiro Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_chaveiro_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_chaveiro_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Chaveiro de teste especializado em serviços de alta qualidade.', '', -5.567510620195749, -47.422003900277645, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_mecânico_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_mecânico_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mecânico Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_mecânico_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_mecânico_1@example.com', 'Mecânico Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_mecânico_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_mecânico_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Mecânico de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.496928943988198, -47.49116946577774, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Mecânico' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_mecânico_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_mecânico_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mecânico Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_mecânico_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_mecânico_2@example.com', 'Mecânico Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_mecânico_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_mecânico_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Mecânico de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.549892888141783, -47.489421050413405, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Mecânico' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_borracheiro_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_borracheiro_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Borracheiro Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_borracheiro_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_borracheiro_1@example.com', 'Borracheiro Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_borracheiro_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_borracheiro_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Borracheiro de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.545905757306173, -47.42973269960749, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_borracheiro_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_borracheiro_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Borracheiro Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_borracheiro_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_borracheiro_2@example.com', 'Borracheiro Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_borracheiro_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_borracheiro_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Borracheiro de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.540020545723889, -47.46311563074994, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_técnico_de_informática_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_informática_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Técnico de Informática Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_informática_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_informática_1@example.com', 'Técnico de Informática Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_informática_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_técnico_de_informática_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Técnico de Informática de teste especializado em serviços de alta qualidade.', '', -5.484479463634679, -47.443686081209506, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_técnico_de_informática_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_informática_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Técnico de Informática Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_informática_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_técnico_de_informática_2@example.com', 'Técnico de Informática Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_técnico_de_informática_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_técnico_de_informática_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Técnico de Informática de teste especializado em serviços de alta qualidade.', '', -5.52949207683487, -47.476387205314026, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_personal_trainer_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_personal_trainer_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Personal Trainer Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_personal_trainer_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_personal_trainer_1@example.com', 'Personal Trainer Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_personal_trainer_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_personal_trainer_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Personal Trainer de teste especializado em serviços de alta qualidade.', '', -5.5028031027545286, -47.462664569616194, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_personal_trainer_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_personal_trainer_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Personal Trainer Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_personal_trainer_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_personal_trainer_2@example.com', 'Personal Trainer Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_personal_trainer_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_personal_trainer_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Personal Trainer de teste especializado em serviços de alta qualidade.', '', -5.56479908335717, -47.47462225132478, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_maquiadora_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_maquiadora_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maquiadora Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_maquiadora_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_maquiadora_1@example.com', 'Maquiadora Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_maquiadora_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_maquiadora_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Maquiadora de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.562968607660355, -47.483255436084605, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_maquiadora_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_maquiadora_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maquiadora Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_maquiadora_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_maquiadora_2@example.com', 'Maquiadora Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_maquiadora_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_maquiadora_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Maquiadora de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.51276362467939, -47.503920013037934, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_pet_shop_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_pet_shop_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pet Shop Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_pet_shop_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_pet_shop_1@example.com', 'Pet Shop Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_pet_shop_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_pet_shop_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Pet Shop de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 100, Imperatriz - MA', -5.543824131067283, -47.48789716577451, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_pet_shop_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_pet_shop_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pet Shop Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_pet_shop_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_pet_shop_2@example.com', 'Pet Shop Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_pet_shop_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_pet_shop_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Pet Shop de teste especializado em serviços de alta qualidade.', 'Rua de Teste, 200, Imperatriz - MA', -5.501657661569816, -47.464208850245726, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_fretes_e_mudanças_1@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_fretes_e_mudanças_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fretes e Mudanças Teste 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_fretes_e_mudanças_1@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_fretes_e_mudanças_1@example.com', 'Fretes e Mudanças Teste 1', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_fretes_e_mudanças_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_fretes_e_mudanças_1@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Fretes e Mudanças de teste especializado em serviços de alta qualidade.', '', -5.550422852325387, -47.41742202472127, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_provider_fretes_e_mudanças_2@example.com';
    
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_provider_fretes_e_mudanças_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fretes e Mudanças Teste 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    -- Tenta encontrar
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_fretes_e_mudanças_2@example.com';
    END IF;
    
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_provider_fretes_e_mudanças_2@example.com', 'Fretes e Mudanças Teste 2', 'provider')
        ON CONFLICT (email) DO UPDATE SET role = 'provider'
        RETURNING id INTO v_public_user_id;
        
        -- Fallback if RETURNING didn't work
        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_provider_fretes_e_mudanças_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_provider_fretes_e_mudanças_2@example.com';
    END IF;

    UPDATE public.users SET role = 'provider', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, address, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Sou um Fretes e Mudanças de teste especializado em serviços de alta qualidade.', '', -5.50674948448677, -47.46013696433159, true, 4.8, 10);
    END IF;

    -- 4. Assign Profession
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1;
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_1@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_1@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 1"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_1@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_1@example.com', 'Motorista Uber 1', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_1@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_1@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.516148694430032, -47.46573103476115, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Toyota Corolla', 'White', 'UBR-0001', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_2@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_2@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 2"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_2@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_2@example.com', 'Motorista Uber 2', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_2@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_2@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.5185561460047055, -47.456224932745606, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Honda Civic', 'Black', 'UBR-0002', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_3@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_3@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 3"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_3@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_3@example.com', 'Motorista Uber 3', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_3@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_3@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.51637642092049, -47.46704141575683, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Chevrolet Onix', 'Grey', 'UBR-0003', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_4@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_4@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 4"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_4@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_4@example.com', 'Motorista Uber 4', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_4@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_4@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.525754297868735, -47.44910120206428, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Hyundai HB20', 'Blue', 'UBR-0004', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_5@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_5@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 5"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_5@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_5@example.com', 'Motorista Uber 5', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_5@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_5@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.540832568988996, -47.44463597976784, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Renault Kwid', 'Red', 'UBR-0005', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_6@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_6@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 6"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_6@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_6@example.com', 'Motorista Uber 6', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_6@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_6@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.522008859811064, -47.460724381545916, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Fiat Argo', 'Silver', 'UBR-0006', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_7@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_7@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 7"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_7@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_7@example.com', 'Motorista Uber 7', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_7@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_7@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.529860147678112, -47.462917283050906, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Volkswagen Gol', 'White', 'UBR-0007', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_8@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_8@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 8"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_8@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_8@example.com', 'Motorista Uber 8', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_8@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_8@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.519358905141265, -47.46842861860636, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Fiat Uno', 'Black', 'UBR-0008', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_9@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_9@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 9"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_9@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_9@example.com', 'Motorista Uber 9', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_9@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_9@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.518679822814158, -47.45298638281523, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Jeep Renegade', 'Grey', 'UBR-0009', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_10@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_10@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 10"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_10@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_10@example.com', 'Motorista Uber 10', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_10@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_10@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.5301471927686, -47.46983952890562, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Jeep Compass', 'Blue', 'UBR-0010', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_11@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_11@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 11"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_11@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_11@example.com', 'Motorista Uber 11', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_11@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_11@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.542169000606424, -47.4676157351211, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Nissan Versa', 'Red', 'UBR-0011', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_12@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_12@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 12"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_12@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_12@example.com', 'Motorista Uber 12', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_12@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_12@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.537822739243157, -47.455880127839706, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Ford Ka', 'Silver', 'UBR-0012', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_13@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_13@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 13"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_13@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_13@example.com', 'Motorista Uber 13', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_13@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_13@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.525321913369488, -47.44985571828032, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Volkswagen Polo', 'White', 'UBR-0013', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_14@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_14@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 14"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_14@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_14@example.com', 'Motorista Uber 14', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_14@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_14@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.524791853682543, -47.47773291502934, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Chevrolet Tracker', 'Black', 'UBR-0014', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_15@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_15@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 15"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_15@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_15@example.com', 'Motorista Uber 15', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_15@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_15@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.519891641076638, -47.46086578221898, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Hyundai Creta', 'Grey', 'UBR-0015', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_16@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_16@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 16"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_16@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_16@example.com', 'Motorista Uber 16', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_16@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_16@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.540166746390552, -47.46539821400202, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Toyota Hilux', 'Blue', 'UBR-0016', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_17@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_17@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 17"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_17@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_17@example.com', 'Motorista Uber 17', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_17@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_17@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.521791371477839, -47.475520025773584, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Honda HR-V', 'Red', 'UBR-0017', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_18@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_18@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 18"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_18@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_18@example.com', 'Motorista Uber 18', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_18@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_18@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.51449181725929, -47.44843201851887, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Fiat Toro', 'Silver', 'UBR-0018', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_19@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_19@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 19"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_19@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_19@example.com', 'Motorista Uber 19', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_19@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_19@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.542326792368826, -47.463588891760814, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Renault Sandero', 'White', 'UBR-0019', 2022);
    END IF;
END $$;

DO $$
DECLARE
    v_supabase_uid UUID;
    v_public_user_id BIGINT;
BEGIN
    -- 1. Get or Create Auth User
    SELECT id INTO v_supabase_uid FROM auth.users WHERE email = 'test_uber_20@example.com';
    IF v_supabase_uid IS NULL THEN
        v_supabase_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
        VALUES (v_supabase_uid, 'test_uber_20@example.com', '$2a$10$78vM9YF.tP.rS7w8O.mG4.G4mU4vO2uU/oG/0uU/oG/0uU/oG/0u', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Motorista Uber 20"}', now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
    END IF;

    -- 2. Get or Create Public User
    SELECT id INTO v_public_user_id FROM public.users WHERE supabase_uid = v_supabase_uid;
    IF v_public_user_id IS NULL THEN
        SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_20@example.com';
    END IF;

    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (supabase_uid, email, full_name, role)
        VALUES (v_supabase_uid, 'test_uber_20@example.com', 'Motorista Uber 20', 'driver')
        ON CONFLICT (email) DO UPDATE SET role = 'driver'
        RETURNING id INTO v_public_user_id;

        IF v_public_user_id IS NULL THEN
           SELECT id INTO v_public_user_id FROM public.users WHERE email = 'test_uber_20@example.com';
        END IF;
    END IF;

    IF v_public_user_id IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Failed to get/create public_user_id for %', 'test_uber_20@example.com';
    END IF;

    UPDATE public.users SET role = 'driver', supabase_uid = v_supabase_uid WHERE id = v_public_user_id;

    -- 3. Create Provider Entry
    IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_public_user_id) THEN
        INSERT INTO public.providers (user_id, bio, latitude, longitude, is_online, rating_avg, rating_count)
        VALUES (v_public_user_id, 'Motorista parceiro Uber disponível para sua viagem.', -5.527409203996824, -47.45467324148739, true, 4.9, 150);
    END IF;

    -- 4. Assign Profession (Transporte)
    IF NOT EXISTS (SELECT 1 FROM public.provider_professions WHERE provider_user_id = v_public_user_id AND profession_id = (SELECT id FROM public.professions WHERE name = 'Transporte' LIMIT 1)) THEN
        INSERT INTO public.provider_professions (provider_user_id, profession_id)
        SELECT v_public_user_id, id FROM public.professions WHERE name = 'Transporte' LIMIT 1;
    END IF;

    -- 5. Create Vehicle
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE driver_id = v_public_user_id) THEN
        INSERT INTO public.vehicles (driver_id, model, color, plate, year)
        VALUES (v_public_user_id, 'Volkswagen Virtus', 'Black', 'UBR-0020', 2022);
    END IF;
END $$;

COMMIT;