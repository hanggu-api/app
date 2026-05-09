-- Auto-generated from TS seeds

INSERT INTO public.professions (name) VALUES ('Barbeiro Masculino');
INSERT INTO public.professions (name) VALUES ('Barbeiro');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Corte Social', 40, 'Duração: 40 min | Faixa: R$ 35-50 | Corte clássico feito na tesoura ou máquina', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Corte Degradê (Fade)', 50, 'Duração: 50 min | Faixa: R$ 45-60 | Estilo moderno com transição suave (máquina)', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Barba Completa', 40, 'Duração: 30 min | Faixa: R$ 30-45 | Alinhamento com navalha e hidratação', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Barboterapia', 50, 'Duração: 45 min | Faixa: R$ 45-65 | Barba com toalha quente, massagem e óleos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Pezinho (Contorno)', 15, 'Duração: 15 min | Faixa: R$ 10-20 | Limpeza rápida apenas nos contornos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Combo: Cabelo + Barba', 80, 'Duração: 75 min | Faixa: R$ 70-90 | O serviço completo para quem tem pouco tempo', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Camuflagem de Fios', 40, 'Duração: 20 min | Faixa: R$ 35-50 | Cobertura rápida de cabelos brancos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                VALUES ((SELECT id FROM public.professions WHERE name = 'Barbeiro Masculino' LIMIT 1), 'Sobrancelha (Navalha)', 20, 'Duração: 15 min | Faixa: R$ 15-25 | Limpeza e desenho da sobrancelha masculina', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1001, 'Gesseiro');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Instalação de Moldura (metro)', 13.5, 'Duração: 30min/m | Instalação de molduras de gesso no teto', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Parede Drywall (m²)', 45, 'Duração: 1h/m² | Construção de parede divisória em drywall', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Reparo em Forro de Gesso (Buraco)', 81, 'Duração: 1h | Fechamento de buracos e acabamento', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Instalação de Sanca Aberta (m)', 45, 'Duração: 1h/m | Sanca com iluminação indireta', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Instalação de Sanca Fechada (m)', 36, 'Duração: 45min/m | Sanca rebaixada simples', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Forro de Gesso Acartonado (m²)', 54, 'Duração: 1h/m² | Forro liso estruturado', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Forro de Gesso Plaquinha (m²)', 36, 'Duração: 45min/m² | Forro tradicional de placas 60x60', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Divisória de Drywall com Porta (m²)', 90, 'Duração: 2h/m² | Parede com requadro para porta', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Aplicação de Gesso 3D (m²)', 45, 'Duração: 1h/m² | Instalação de placas decorativas 3D', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Instalação de Cortineiro (m)', 27, 'Duração: 30min/m | Acabamento em gesso para cortinas', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Closet de Gesso (unidade)', 450, 'Duração: 4h-8h | Estrutura básica para closet (prateleiras)', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Gesseiro' LIMIT 1), 'Estante ou Nicho de Gesso (unidade)', 180, 'Duração: 2h-4h | Nichos decorativos ou funcionais', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1002, 'Carpinteiro');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1), 'Instalação de Portas', 90, 'Duração: 1h-2h | Instalação de porta interna ou externa', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1), 'Montagem de Móveis', 72, 'Duração: 1h | Montagem de guarda-roupa, armário, etc.', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1), 'Reparo de Telhado', 135, 'Duração: 2h | Troca de telhas, eliminação de goteiras', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1), 'Construção de Deck (m²)', 180, 'Duração: 4h | Preço por m² estimado', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Carpinteiro' LIMIT 1), 'Instalação de Rodapé', 45, 'Duração: 1h | Instalação de rodapé de madeira ou poliestireno', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1003, 'Técnico de Refrigeração');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1), 'Limpeza de Ar Condicionado (Split)', 108, 'Duração: 1h | Higienização completa unidade interna e externa', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1), 'Instalação de Ar Condicionado', 315, 'Duração: 2h-3h | Instalação completa com suporte', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1), 'Carga de Gás', 135, 'Duração: 40min | Reposição de gás refrigerante', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1), 'Manutenção Preventiva', 90, 'Duração: 45min | Verificação geral e limpeza de filtros', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Refrigeração' LIMIT 1), 'Conserto de Geladeira', 135, 'Duração: 1h | Diagnóstico e reparo (peças à parte)', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1004, 'Chaveiro');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1), 'Abertura de Porta Residencial', 54, 'Duração: 20min | Sem troca de fechadura', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1), 'Troca de Fechadura', 63, 'Duração: 30min | Mão de obra (fechadura à parte ou inclusa se simples)', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1), 'Cópia de Chave Simples', 13.5, 'Duração: 10min | Preço por unidade', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1), 'Abertura de Carro', 108, 'Duração: 30min | Abertura técnica sem danos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Chaveiro' LIMIT 1), 'Confecção de Chave Codificada', 225, 'Duração: 1h | Chave automotiva com chip', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1005, 'Mecânico');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1), 'Troca de Óleo e Filtro', 180, 'Duração: 40min | Incluindo filtro simples', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1), 'Revisão de Freios (Mão de obra)', 150, 'Duração: 1h 30min | Verificação de pastilhas e discos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1), 'Troca de Bateria', 45, 'Duração: 20min | Apenas instalação', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1), 'Diagnóstico Computadorizado', 120, 'Duração: 30min | Scanner de erros', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Mecânico' LIMIT 1), 'Reparo de Suspensão (Lado)', 200, 'Duração: 2h | Troca de amortecedor ou buchas', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1006, 'Borracheiro');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1), 'Remendo de Pneu (Simples)', 30, 'Duração: 15min | Macarrão ou frio', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1), 'Balanceamento (Roda)', 25, 'Duração: 10min | Preço por roda', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1), 'Vulcanização', 80, 'Duração: 2h | Reparo em corte lateral', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Borracheiro' LIMIT 1), 'Troca de Estepe', 40, 'Duração: 15min | Atendimento local', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1007, 'Técnico de Informática');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1), 'Formatação com Backup', 150, 'Duração: 3h | Windows + Drivers + Programas', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1), 'Limpeza Interna e Pasta Térmica', 120, 'Duração: 1h 30min | Notebook ou Desktop', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1), 'Configuração de Roteador Wi-Fi', 80, 'Duração: 30min | Configuração de rede e senha', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1), 'Remoção de Vírus/Malware', 100, 'Duração: 1h | Otimização de sistema', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Técnico de Informática' LIMIT 1), 'Troca de Tela de Notebook', 180, 'Duração: 1h | Mão de obra (peça à parte)', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1008, 'Personal Trainer');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1), 'Consultoria Mensal (Online)', 250, 'Treino + Suporte via app', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1), 'Aula Particular (Sessão)', 90, 'Duração: 1h | Presencial ou outdoor', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Personal Trainer' LIMIT 1), 'Avaliação Física Completa', 120, 'Duração: 45min | Bioimpedância + Medas', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1009, 'Maquiadora');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1), 'Maquiagem Social', 180, 'Duração: 1h | Com cílios inclusos', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1), 'Maquiagem de Noiva', 500, 'Duração: 2h 30min | Inclui teste prévio', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1), 'Design de Sobrancelha (Pinça)', 45, 'Duração: 30min | Limpeza e desenho', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Maquiadora' LIMIT 1), 'Curso de Automaquiagem', 300, 'Duração: 4h | Individual', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1010, 'Pet Shop');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1), 'Banho e Tosa (Porte P)', 90, 'Duração: 1h 30min | Inclui corte de unha', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1), 'Tosa Higiênica', 50, 'Duração: 40min | Apenas áreas críticas', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1), 'Adestramento (Aula)', 120, 'Duração: 1h | Com comportamento básico', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Pet Shop' LIMIT 1), 'Hospedagem Pet (Diária)', 80, 'Preço por dia/animal', 'fixed', true);
INSERT INTO public.professions (id, name) VALUES (1011, 'Fretes e Mudanças');
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1), 'Carreto Simples (Até 5km)', 150, 'Duração: 1h | Apenas motorista (sem ajudante)', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1), 'Mudança Residencial Completa', 800, 'Estimativa inicial | Caminhão + 2 ajudantes', 'fixed', true);
INSERT INTO public.task_catalog (profession_id, name, unit_price, keywords, pricing_type, active) 
                                       VALUES ((SELECT id FROM public.professions WHERE name = 'Fretes e Mudanças' LIMIT 1), 'Transporte de Eletrodoméstico', 120, 'Geladeira, fogão ou máquina de lavar', 'fixed', true);
