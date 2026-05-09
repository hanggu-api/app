                                                                                        -- Seed: BR service catalog with realistic services, typical prices and durations
                                                                                        -- Idempotent using WHERE NOT EXISTS.

                                                                                        -- 1. Create temporary category map (optional, but helps keep it clean)
                                                                                        -- Assistencia Tecnica: 1, Eletricista: 2, Pintura: 3, Marcenaria: 4, Manutenção: 5, Geral: 6

                                                                                        -- -------------------------------------------------------------------
                                                                                        -- Professions (home/on-site & beauty)
                                                                                        -- -------------------------------------------------------------------

                                                                                        -- Manutenção / Eletricista / etc
                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Eletricista Residencial', 'on_site', 2 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Eletricista Residencial');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Encanador', 'on_site', 5 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Encanador');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Diarista / Faxineira', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Diarista / Faxineira');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Chaveiro', 'on_site', 5 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Chaveiro');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Montador de Móveis', 'on_site', 4 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Montador de Móveis');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Técnico de Ar Condicionado', 'on_site', 1 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Técnico de Ar Condicionado');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Desentupidor', 'on_site', 5 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Desentupidor');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Mecânico (Serviços Rápidos)', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Mecânico (Serviços Rápidos)');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Borracheiro', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Borracheiro');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Guincheiro', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Guincheiro');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Barbeiro', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Barbeiro');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Cabeleireiro (Unissex)', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Cabeleireiro (Unissex)');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Manicure / Pedicure', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Manicure / Pedicure');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Maquiadora Profissional', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Maquiadora Profissional');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Esteticista (Limpeza de Pele)', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Esteticista (Limpeza de Pele)');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Depiladora', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Depiladora');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Designer de Sobrancelhas', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Designer de Sobrancelhas');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Massageador', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Massageador');

                                                                                        INSERT INTO public.professions (name, service_type, category_id)
                                                                                        SELECT 'Podóloga', 'on_site', 6 WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Podóloga');


                                                                                        -- -------------------------------------------------------------------
                                                                                        -- Task Catalog (Enriched with realistic BR Prices)
                                                                                        -- -------------------------------------------------------------------

                                                                                        DO $$ 
                                                                                        DECLARE 
                                                                                            prof_id bigint;
                                                                                        BEGIN

                                                                                            -- ELETRICISTA RESIDENCIAL
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Eletricista Residencial';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Instalação de Chuveiro', 'fixed', 80.00, 'instalar chuveiro; troca resistência; 220v; 110v; fiação; Duração: 40 min'),
                                                                                                (prof_id, 'Troca de Disjuntor', 'fixed', 60.00, 'disjuntor no quadro; curto; queda energia; Duração: 30 min'),
                                                                                                (prof_id, 'Instalação de Tomada/Interruptor', 'fixed', 40.00, 'trocar tomada; interruptor; ponto de luz; Duração: 20 min'),
                                                                                                (prof_id, 'Reparo em Curto-Circuito', 'hourly', 120.00, 'emergência; cheiro queimado; sem luz; Duração: 1-2 horas'),
                                                                                                (prof_id, 'Instalação de Ventilador de Teto', 'fixed', 150.00, 'montar ventilador; controle remoto; Duração: 1h 30 min'),
                                                                                                (prof_id, 'Instalação de Luminária/Lustre', 'fixed', 70.00, 'painel led; spot; pendente; Duração: 40 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- ENCANADOR
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Encanador';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Troca de Torneira/Sifão', 'fixed', 70.00, 'vazamento pia; trocar torneira cozinha; Duração: 30 min'),
                                                                                                (prof_id, 'Reparo em Descarga/Vaso', 'fixed', 90.00, 'caixa acoplada; válvula hydra; vazamento; Duração: 50 min'),
                                                                                                (prof_id, 'Limpeza de Caixa d''Água', 'fixed', 200.00, 'lavagem caixa; higienização; Duração: 2 horas'),
                                                                                                (prof_id, 'Conserto de Vazamento (Visível)', 'fixed', 100.00, 'tubulação quebrada; cano furado; furou parede; Duração: 1 hora'),
                                                                                                (prof_id, 'Instalação de Chuveiro (Hidráulica)', 'fixed', 50.00, 'troca de mangueira; engate; Duração: 20 min'),
                                                                                                (prof_id, 'Desentupimento Simples (Pia/Ralo)', 'fixed', 80.00, 'pia entupida; ralo banheiro; Duração: 40 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- CHAVEIRO
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Chaveiro';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Abertura de Residência', 'fixed', 120.00, 'abrir porta; perdeu chave; emergência; Duração: 30 min'),
                                                                                                (prof_id, 'Troca de Cilindro (Miolo)', 'fixed', 90.00, 'segurança; mudar chave; fechadura; Duração: 40 min'),
                                                                                                (prof_id, 'Cópia de Chave Comum', 'fixed', 15.00, 'cópia simples; yale; Duração: 10 min'),
                                                                                                (prof_id, 'Abertura de Veículo', 'fixed', 150.00, 'chave dentro do carro; trancou carro; Duração: 30 min'),
                                                                                                (prof_id, 'Cópia de Chave Tetra', 'fixed', 45.00, 'chave de segurança; Duração: 15 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- MONTADOR DE MÓVEIS
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Montador de Móveis';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Montagem de Guarda-Roupa (Até 4p)', 'fixed', 180.00, 'móvel novo; montagem; Duração: 3 horas'),
                                                                                                (prof_id, 'Montagem de Armário de Cozinha', 'fixed', 150.00, 'instalação parede; suspensos; Duração: 2 horas'),
                                                                                                (prof_id, 'Montagem de Escrivaninha/Mesa', 'fixed', 80.00, 'home office; mesa pc; Duração: 1 hora'),
                                                                                                (prof_id, 'Desmontagem de Móvel', 'hourly', 70.00, 'mudança; desmontar guarda-roupa; Duração: 1-2 horas'),
                                                                                                (prof_id, 'Instalação de Painel de TV', 'fixed', 120.00, 'furar parede; suporte tv; Duração: 1 hora')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- MECÂNICO (SERVIÇOS RÁPIDOS)
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Mecânico (Serviços Rápidos)';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Troca de Óleo e Filtro', 'fixed', 60.00, 'lubrificante; manutenção motor; Duração: 40 min'),
                                                                                                (prof_id, 'Substituição de Bateria', 'fixed', 50.00, 'bateria arriada; carro não liga; socorro; Duração: 30 min'),
                                                                                                (prof_id, 'Troca de Pastilha de Freio', 'fixed', 120.00, 'freio chiando; segurança; Duração: 1 hora'),
                                                                                                (prof_id, 'Revisão Básica (Checklist)', 'fixed', 150.00, 'viajar; checar fluídos; luzes; pneus; Duração: 1h 30 min'),
                                                                                                (prof_id, 'Substituição de Lâmpadas', 'fixed', 30.00, 'farol queimado; lanterna; Duração: 20 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- BARBEIRO
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Barbeiro';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Corte Masculino (Máquina/Tesoura)', 'fixed', 50.00, 'cabelo masculino; degrade; Duração: 40 min'),
                                                                                                (prof_id, 'Barba Completa (Navalha/Toalha)', 'fixed', 40.00, 'fazer barba; design; Duração: 30 min'),
                                                                                                (prof_id, 'Combo: Cabelo + Barba', 'fixed', 80.00, 'pacote completo; Duração: 1 hora'),
                                                                                                (prof_id, 'Acabamento (Pezinho)', 'fixed', 20.00, 'limpar pescoço; Duração: 15 min'),
                                                                                                (prof_id, 'Pigmentação de Barba', 'fixed', 35.00, 'pintura; cobertura falhas; Duração: 30 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- CABELEIREIRO (UNISSEX)
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Cabeleireiro (Unissex)';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Corte Feminino', 'fixed', 120.00, 'estilo; pontas; Duração: 1 hora'),
                                                                                                (prof_id, 'Escova', 'fixed', 70.00, 'alisamento temporário; secador; Duração: 45 min'),
                                                                                                (prof_id, 'Hidratação Capilar', 'fixed', 90.00, 'tratamento; brilho; Duração: 50 min'),
                                                                                                (prof_id, 'Progressiva', 'fixed', 250.00, 'alisamento definitivo; química; Duração: 3 horas'),
                                                                                                (prof_id, 'Penteado', 'fixed', 180.00, 'festa; casamento; Duração: 1h 30 min')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- MANICURE / PEDICURE
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Manicure / Pedicure';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Manicure (Mão)', 'fixed', 35.00, 'unhas; cutícula; esmalte; Duração: 40 min'),
                                                                                                (prof_id, 'Pedicure (Pé)', 'fixed', 40.00, 'unhas pé; Duração: 50 min'),
                                                                                                (prof_id, 'Combo: Mão e Pé', 'fixed', 70.00, 'completo; Duração: 1h 30 min'),
                                                                                                (prof_id, 'Alongamento em Gel', 'fixed', 150.00, 'unha gel; tips; Duração: 2 horas'),
                                                                                                (prof_id, 'Manutenção em Gel', 'fixed', 90.00, 'reparo gel; Duração: 1 hora')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                            -- DIARISTA / FAXINEIRA
                                                                                            SELECT id INTO prof_id FROM public.professions WHERE name = 'Diarista / Faxineira';
                                                                                            IF prof_id IS NOT NULL THEN
                                                                                                INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_price, keywords)
                                                                                                VALUES 
                                                                                                (prof_id, 'Faxina de Rotina (Até 4h)', 'fixed', 150.00, 'limpeza rápida; manutenção; Duração: 4 horas'),
                                                                                                (prof_id, 'Faxina Completa (Diária 8h)', 'fixed', 220.00, 'limpeza pesada; casa inteira; Duração: 8 horas'),
                                                                                                (prof_id, 'Passar Roupa (Por Hora)', 'hourly', 45.00, 'ferro de passar; Duração: 1h por lote'),
                                                                                                (prof_id, 'Limpeza Pós-Obra', 'hourly', 60.00, 'remover entulho; pó de gesso; Duração: Média 6-10 horas')
                                                                                                ON CONFLICT (profession_id, name) DO NOTHING;
                                                                                            END IF;

                                                                                        END $$;
