-- Seed: Emergency / 24h catalog (MA/TO/PA)
-- Populates public.professions (on_site) and public.task_catalog with realistic task names,
-- typical prices, and typical duration/notes encoded in task_catalog.keywords.
--
-- Idempotent: uses WHERE NOT EXISTS per profession/task.

-- -------------------------------------------------------------------
-- Professions (on_site, emergency)
-- -------------------------------------------------------------------

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Chaveiro 24h (Residencial)', 'on_site',
       'porta; fechadura; chave; yale; tetra; multiponto; segredo; trancada; chave quebrada; olho mágico; ferrolho; mola aérea',
       95
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Chaveiro 24h (Residencial)');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Eletricista Plantão', 'on_site',
       'tomada; disjuntor; curto; fiação; quadro; chuveiro; resistência; sem luz; luminária; ventilador; campainha; sensor; aterramento',
       95
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Eletricista Plantão');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Encanador Plantão', 'on_site',
       'vazamento; torneira; sifão; registro; descarga; hydra; boia; caixa d''água; flexível; ducha higiênica; vedação; infiltração',
       95
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Encanador Plantão');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Desentupidora 24h', 'on_site',
       'entupimento; vaso; ralo; pia; esgoto; coluna; caixa de gordura; inspeção; hidrojateamento; mau cheiro; transbordando',
       90
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Desentupidora 24h');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Borracheiro 24h (Socorro)', 'on_site',
       'pneu; furo; estepe; macarrão; remendo; calibragem; válvula; roda; parafuso; estrada; rodovia; moto; câmara de ar; selante',
       90
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Borracheiro 24h (Socorro)');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Guincho / Reboque 24h', 'on_site',
       'guincho; reboque; plataforma; pane; pane seca; rodovia; garagem; acidente leve; atolado; vala; SUV; pickup; moto; km',
       85
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Guincho / Reboque 24h');

-- -------------------------------------------------------------------
-- Tasks: Chaveiro 24h (Residencial) — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Abertura de porta (fechadura simples)', 'fixed', 'serviço', 140,
       'Duração: 15-45 min | Atendimento: 24h | Inclui: abertura sem danificar quando possível | Não inclui: troca de peça | Observações: pode variar por tipo de fechadura e urgência.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Abertura de porta (fechadura simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Abertura de porta (tetra/segredo)', 'fixed', 'serviço', 190,
       'Duração: 20-60 min | Atendimento: 24h | Inclui: abertura com ferramentas adequadas | Não inclui: cilindro novo | Observações: maior complexidade, risco de troca do cilindro.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Abertura de porta (tetra/segredo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de cilindro (Yale)', 'fixed', 'serviço', 160,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e ajuste | Não inclui: cilindro/fechadura | Observações: compatibilidade do modelo pode alterar tempo.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de cilindro (Yale)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de fechadura completa (porta madeira)', 'fixed', 'serviço', 220,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: instalação e ajuste | Não inclui: fechadura | Observações: pode exigir furação/ajuste da porta.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de fechadura completa (porta madeira)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de fechadura completa (porta ferro)', 'fixed', 'serviço', 260,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: instalação e ajuste | Não inclui: fechadura | Observações: pode precisar alinhar/regular batente.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de fechadura completa (porta ferro)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo de fechadura travando', 'fixed', 'serviço', 130,
       'Duração: 20-60 min | Atendimento: 24h | Inclui: regulagem/limpeza simples | Não inclui: peças | Observações: se houver desgaste, pode exigir troca.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo de fechadura travando');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de fechadura nova', 'fixed', 'serviço', 230,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: instalação e testes | Não inclui: fechadura | Observações: pode exigir furação e ajuste de porta.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de fechadura nova');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de olho mágico', 'fixed', 'serviço', 120,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: furação e instalação | Não inclui: olho mágico | Observações: compatível com espessura da porta.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de olho mágico');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de trinco/ferrolho', 'fixed', 'serviço', 110,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: instalação e ajuste | Não inclui: trinco | Observações: reforço de segurança.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de trinco/ferrolho');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de fechadura auxiliar', 'fixed', 'serviço', 170,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: instalação e testes | Não inclui: fechadura | Observações: aumenta segurança (porta principal).',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de fechadura auxiliar');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cópia de chave Yale', 'fixed', 'unidade', 14,
       'Duração: 5-10 min | Atendimento: 24h | Inclui: cópia simples | Observações: pode exigir levar a chave ao profissional.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cópia de chave Yale');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cópia de chave tetra', 'fixed', 'unidade', 25,
       'Duração: 5-15 min | Atendimento: 24h | Inclui: cópia tetra | Observações: preço varia por modelo.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cópia de chave tetra');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cópia de chave multiponto', 'fixed', 'unidade', 70,
       'Duração: 10-30 min | Atendimento: 24h | Inclui: cópia multiponto | Observações: depende do blank/modelo (pode ser mais caro).',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cópia de chave multiponto');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ajuste de porta “pegando” (alinhamento básico)', 'fixed', 'serviço', 120,
       'Duração: 20-60 min | Atendimento: 24h | Inclui: ajustes básicos em fechadura/batente | Observações: não inclui marcenaria pesada.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ajuste de porta “pegando” (alinhamento básico)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de mola aérea', 'fixed', 'serviço', 190,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: instalação e regulagem | Não inclui: mola | Observações: porta pode precisar de reforço.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de mola aérea');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Abertura de cadeado (simples)', 'fixed', 'serviço', 90,
       'Duração: 10-30 min | Atendimento: 24h | Inclui: abertura | Observações: pode inutilizar o cadeado em alguns casos.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Abertura de cadeado (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Abertura de portão com chave perdida (mecanismo simples)', 'fixed', 'serviço', 170,
       'Duração: 30-75 min | Atendimento: 24h | Inclui: abertura/ajuste simples | Observações: portões com automatizador podem exigir outro serviço.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Abertura de portão com chave perdida (mecanismo simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de segredo (conjunto)', 'fixed', 'serviço', 180,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: troca e testes | Não inclui: peças | Observações: pode ser necessário cilindro novo.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de segredo (conjunto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Remoção de chave quebrada (cilindro)', 'fixed', 'serviço', 120,
       'Duração: 15-45 min | Atendimento: 24h | Inclui: retirada e testes | Observações: pode exigir troca de cilindro se danificado.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Remoção de chave quebrada (cilindro)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento emergencial (deslocamento)', 'fixed', 'chamado', 80,
       'Duração: 0 min | Atendimento: 24h | Inclui: deslocamento e avaliação | Observações: pode ser abatido do serviço conforme combinado.',
       true
FROM public.professions p
WHERE p.name = 'Chaveiro 24h (Residencial)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento emergencial (deslocamento)');

-- -------------------------------------------------------------------
-- Tasks: Eletricista Plantão — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de disjuntor', 'fixed', 'unidade', 80,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: troca e testes básicos | Não inclui: disjuntor | Âncoras: disjuntor; quadro; curto.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de disjuntor');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de tomada/interruptor', 'fixed', 'unidade', 65,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: troca e teste | Não inclui: tomada/interruptor | Âncoras: tomada; interruptor; curto.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de tomada/interruptor');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de chuveiro/ducha', 'fixed', 'serviço', 120,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: chuveiro | Âncoras: chuveiro; resistência; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de chuveiro/ducha');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Chuveiro não esquenta (diagnóstico + ajuste)', 'fixed', 'serviço', 110,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: diagnóstico básico e ajuste | Não inclui: peças | Âncoras: chuveiro; resistência; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Chuveiro não esquenta (diagnóstico + ajuste)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Tomada queimando/cheiro de queimado (urgência)', 'fixed', 'serviço', 160,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: isolamento e correção simples | Observações: pode exigir troca de fiação/tomada | Âncoras: tomada; curto; fiação.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Tomada queimando/cheiro de queimado (urgência)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Curto no circuito (isolamento e correção simples)', 'fixed', 'serviço', 180,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: localizar curto simples e corrigir | Não inclui: troca extensa de fiação | Âncoras: curto; disjuntor; fiação.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Curto no circuito (isolamento e correção simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Queda de energia parcial (diagnóstico)', 'fixed', 'visita', 150,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: diagnóstico do circuito/quadros | Observações: reparo pode virar outro serviço | Âncoras: sem luz; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Queda de energia parcial (diagnóstico)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de lâmpada/luminária (simples)', 'fixed', 'unidade', 50,
       'Duração: 10-25 min | Atendimento: 24h | Inclui: troca e teste | Não inclui: lâmpada/luminária | Âncoras: lâmpada; luminária.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de lâmpada/luminária (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de luminária/plafon', 'fixed', 'unidade', 90,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: luminária | Âncoras: plafon; luminária.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de luminária/plafon');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de ventilador de teto', 'fixed', 'serviço', 180,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: instalação e balanceamento básico | Não inclui: ventilador | Âncoras: ventilador; fiação.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de ventilador de teto');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo em fiação aparente (pequeno trecho)', 'fixed', 'serviço', 160,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: correção de trecho curto | Não inclui: materiais extensos | Âncoras: fiação; curto.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo em fiação aparente (pequeno trecho)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo em quadro de disjuntores (aperto/organização)', 'fixed', 'serviço', 180,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: aperto, identificação simples e testes | Não inclui: troca de quadro | Âncoras: quadro; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo em quadro de disjuntores (aperto/organização)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de resistência de chuveiro', 'fixed', 'serviço', 85,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: troca e teste | Não inclui: resistência | Âncoras: resistência; chuveiro.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de resistência de chuveiro');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de campainha (simples)', 'fixed', 'serviço', 100,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: campainha | Âncoras: campainha; fiação.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de campainha (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de sensor de presença', 'fixed', 'unidade', 120,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e ajuste | Não inclui: sensor | Âncoras: sensor; iluminação.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de sensor de presença');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de tomada 220↔110 (adequação simples)', 'fixed', 'unidade', 90,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: troca/adequação básica | Observações: depende do circuito existente | Âncoras: tomada; tensão.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de tomada 220↔110 (adequação simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de DPS (dispositivo de proteção)', 'fixed', 'unidade', 160,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: DPS | Âncoras: DPS; quadro; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de DPS (dispositivo de proteção)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Aterramento (avaliação básica)', 'fixed', 'visita', 180,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: avaliação e orientação | Observações: execução pode exigir materiais/obra | Âncoras: aterramento.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Aterramento (avaliação básica)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de soquete/bocal', 'fixed', 'unidade', 55,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: troca e teste | Não inclui: soquete | Âncoras: soquete; lâmpada.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de soquete/bocal');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Emergência: “sem luz à noite” (atendimento)', 'fixed', 'chamado', 220,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: diagnóstico e correção simples | Observações: urgência noturna pode elevar custo | Âncoras: sem luz; disjuntor.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Emergência: “sem luz à noite” (atendimento)');

-- (Mais uma para fechar 20)
INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de tomada com aterramento (ponto)', 'fixed', 'unidade', 95,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: materiais | Âncoras: tomada; aterramento.',
       true
FROM public.professions p
WHERE p.name = 'Eletricista Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de tomada com aterramento (ponto)');

-- -------------------------------------------------------------------
-- Tasks: Encanador Plantão — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vazamento em torneira (reparo)', 'fixed', 'serviço', 90,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: vedação/ajuste simples | Não inclui: torneira | Âncoras: vazamento; torneira.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vazamento em torneira (reparo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vazamento em sifão (reparo)', 'fixed', 'serviço', 95,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: reaperto/troca de vedação | Não inclui: sifão novo | Âncoras: sifão; pia; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vazamento em sifão (reparo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vazamento em registro (troca)', 'fixed', 'serviço', 160,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: troca e teste | Não inclui: registro | Âncoras: registro; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vazamento em registro (troca)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vazamento em caixa acoplada (boia/vedação)', 'fixed', 'serviço', 120,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: ajuste/troca de boia/vedação | Não inclui: kit completo | Âncoras: caixa acoplada; boia.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vazamento em caixa acoplada (boia/vedação)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo válvula Hydra (kit reparo)', 'fixed', 'serviço', 180,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: troca de reparo e teste | Não inclui: kit | Âncoras: hydra; descarga.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo válvula Hydra (kit reparo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de torneira (instalação)', 'fixed', 'serviço', 150,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: instalação e vedação | Não inclui: torneira | Âncoras: torneira; pia.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de torneira (instalação)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de chuveiro (instalação hidráulica)', 'fixed', 'serviço', 110,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: troca e vedação | Não inclui: chuveiro | Âncoras: chuveiro; vedação.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de chuveiro (instalação hidráulica)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupimento simples de pia (manual)', 'fixed', 'serviço', 140,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: desobstrução simples | Observações: se precisar equipamento vira desentupidora | Âncoras: pia; entupimento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupimento simples de pia (manual)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupimento simples de ralo (manual)', 'fixed', 'serviço', 140,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: desobstrução simples | Âncoras: ralo; entupimento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupimento simples de ralo (manual)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de sifão (unidade)', 'fixed', 'unidade', 90,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: sifão | Âncoras: sifão; pia.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de sifão (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de flexível (unidade)', 'fixed', 'unidade', 80,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: troca e vedação | Não inclui: flexível | Âncoras: flexível; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de flexível (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de boia caixa d’água', 'fixed', 'serviço', 220,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: troca e ajuste | Não inclui: boia | Âncoras: boia; caixa d''água.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de boia caixa d’água');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Limpeza caixa d’água (serviço)', 'fixed', 'serviço', 300,
       'Duração: 2-4h | Atendimento: 24h | Inclui: limpeza e descarte adequado | Observações: depende de litros/acesso | Âncoras: caixa d''água; limpeza.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Limpeza caixa d’água (serviço)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo em vazamento de cano aparente', 'fixed', 'serviço', 170,
       'Duração: 45-120 min | Atendimento: 24h | Inclui: reparo local | Não inclui: quebra/reforma | Âncoras: cano; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo em vazamento de cano aparente');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de ducha higiênica', 'fixed', 'serviço', 140,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: instalação e vedação | Não inclui: ducha | Âncoras: ducha higiênica; registro.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de ducha higiênica');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de filtro de água (ponto)', 'fixed', 'serviço', 150,
       'Duração: 45-90 min | Atendimento: 24h | Inclui: instalação e teste | Não inclui: filtro | Âncoras: filtro; torneira.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de filtro de água (ponto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vedação de vazamento (silicone/veda rosca)', 'fixed', 'serviço', 90,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: vedação simples | Não inclui: peças | Âncoras: vedação; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vedação de vazamento (silicone/veda rosca)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de assento sanitário', 'fixed', 'serviço', 70,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: troca | Não inclui: assento | Âncoras: vaso; assento.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de assento sanitário');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reinstalação de vaso (simples, sem obra)', 'fixed', 'serviço', 220,
       'Duração: 60-120 min | Atendimento: 24h | Inclui: reinstalação e vedação | Não inclui: peças/quebra | Âncoras: vaso; vedação.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reinstalação de vaso (simples, sem obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Emergência: “vazamento forte” (contenção + reparo)', 'fixed', 'chamado', 280,
       'Duração: 60-150 min | Atendimento: 24h | Inclui: contenção e reparo simples | Observações: pode exigir materiais/obra | Âncoras: vazamento; registro; cano.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Emergência: “vazamento forte” (contenção + reparo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Deslocamento emergencial (hidráulica)', 'fixed', 'chamado', 80,
       'Duração: 0 min | Atendimento: 24h | Inclui: deslocamento e avaliação | Observações: pode ser abatido do serviço conforme combinado.',
       true
FROM public.professions p
WHERE p.name = 'Encanador Plantão'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Deslocamento emergencial (hidráulica)');

-- -------------------------------------------------------------------
-- Tasks: Desentupidora 24h — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir vaso sanitário (manual)', 'fixed', 'serviço', 180,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: desentupimento com ferramentas manuais | Observações: pode evoluir para equipamento | Âncoras: vaso; entupimento.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir vaso sanitário (manual)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir vaso (com equipamento)', 'fixed', 'serviço', 280,
       'Duração: 45-120 min | Atendimento: 24h | Inclui: equipamento (sonda) | Observações: depende do acesso | Âncoras: vaso; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir vaso (com equipamento)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir pia de cozinha', 'fixed', 'serviço', 220,
       'Duração: 45-120 min | Atendimento: 24h | Inclui: desobstrução e limpeza simples | Âncoras: pia; gordura; cozinha.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir pia de cozinha');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir ralo de banheiro', 'fixed', 'serviço', 200,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: desentupimento e limpeza | Âncoras: ralo; banheiro.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir ralo de banheiro');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir ralo externo', 'fixed', 'serviço', 250,
       'Duração: 45-150 min | Atendimento: 24h | Inclui: desentupimento externo | Observações: pode exigir hidrojato | Âncoras: ralo; quintal.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir ralo externo');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir coluna/ramal (residencial)', 'fixed', 'serviço', 350,
       'Duração: 60-180 min | Atendimento: 24h | Inclui: desobstrução de ramal | Observações: condomínio pode ter regras | Âncoras: coluna; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir coluna/ramal (residencial)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Limpeza de caixa de gordura (pequena)', 'fixed', 'serviço', 280,
       'Duração: 60-150 min | Atendimento: 24h | Inclui: limpeza e descarte | Observações: depende do volume e acesso | Âncoras: caixa de gordura; cozinha.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Limpeza de caixa de gordura (pequena)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Limpeza de caixa de inspeção', 'fixed', 'serviço', 260,
       'Duração: 60-150 min | Atendimento: 24h | Inclui: limpeza e remoção de resíduos | Âncoras: caixa de inspeção; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Limpeza de caixa de inspeção');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desobstrução de esgoto externo (trecho curto)', 'fixed', 'serviço', 320,
       'Duração: 60-180 min | Atendimento: 24h | Inclui: desobstrução externa | Observações: pode exigir escavação (não inclusa) | Âncoras: esgoto; quintal.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desobstrução de esgoto externo (trecho curto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Hidrojateamento (residencial leve)', 'fixed', 'serviço', 650,
       'Duração: 90-240 min | Atendimento: 24h | Inclui: hidrojateamento leve | Observações: depende do comprimento/diâmetro | Âncoras: hidrojateamento; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Hidrojateamento (residencial leve)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Inspeção com câmera (diagnóstico)', 'fixed', 'serviço', 380,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: inspeção e laudo simples | Observações: disponível conforme equipamento | Âncoras: câmera; diagnóstico.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Inspeção com câmera (diagnóstico)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Prevenção: limpeza de tubulação (manutenção)', 'fixed', 'serviço', 300,
       'Duração: 60-180 min | Atendimento: 24h | Inclui: limpeza preventiva | Observações: evita entupimentos recorrentes | Âncoras: manutenção; tubulação.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Prevenção: limpeza de tubulação (manutenção)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Remoção de mau cheiro (diagnóstico sifão/vedação)', 'fixed', 'visita', 220,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: diagnóstico e correção simples | Observações: pode exigir reparos hidráulicos | Âncoras: mau cheiro; sifão.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Remoção de mau cheiro (diagnóstico sifão/vedação)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir tanque/lavanderia', 'fixed', 'serviço', 200,
       'Duração: 45-120 min | Atendimento: 24h | Inclui: desobstrução | Âncoras: tanque; lavanderia.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir tanque/lavanderia');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupir calha pluvial (simples)', 'fixed', 'serviço', 240,
       'Duração: 60-150 min | Atendimento: 24h | Inclui: desobstrução simples | Observações: altura/acesso podem alterar | Âncoras: calha; chuva.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupir calha pluvial (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Serviço emergencial noturno (deslocamento)', 'fixed', 'chamado', 120,
       'Duração: 0 min | Atendimento: 24h | Inclui: deslocamento noturno | Observações: pode ser abatido do serviço conforme combinado.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Serviço emergencial noturno (deslocamento)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento condomínios (taxa base)', 'fixed', 'chamado', 150,
       'Duração: 0 min | Atendimento: 24h | Inclui: taxa base para condomínio | Observações: regras de acesso/horário podem aplicar.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento condomínios (taxa base)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento comércio (taxa base)', 'fixed', 'chamado', 160,
       'Duração: 0 min | Atendimento: 24h | Inclui: taxa base para comércio | Observações: pode haver necessidade de contrato/manutenção.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento comércio (taxa base)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desentupimento + limpeza final', 'fixed', 'serviço', 300,
       'Duração: 60-150 min | Atendimento: 24h | Inclui: desentupimento e limpeza do local | Âncoras: limpeza; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desentupimento + limpeza final');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, '“Ralo transbordando” (urgência)', 'fixed', 'chamado', 320,
       'Duração: 60-180 min | Atendimento: 24h | Inclui: urgência + desobstrução | Observações: pode exigir hidrojato | Âncoras: ralo; transbordando; esgoto.',
       true
FROM public.professions p
WHERE p.name = 'Desentupidora 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = '“Ralo transbordando” (urgência)');

-- -------------------------------------------------------------------
-- Tasks: Borracheiro 24h (Socorro) — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de pneu (colocar estepe)', 'fixed', 'serviço', 100,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: troca e aperto | Não inclui: pneu/estepe | Âncoras: carro; pneu; estepe.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de pneu (colocar estepe)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo de pneu (macarrão externo)', 'fixed', 'serviço', 55,
       'Duração: 20-40 min | Atendimento: 24h | Inclui: reparo simples | Observações: depende do furo | Âncoras: carro; pneu; furo.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo de pneu (macarrão externo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo de pneu (remendo interno)', 'fixed', 'serviço', 80,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: desmontagem e remendo interno | Âncoras: carro; pneu; remendo.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo de pneu (remendo interno)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Calibragem (4 pneus)', 'fixed', 'serviço', 25,
       'Duração: 10-20 min | Atendimento: 24h | Inclui: calibragem | Âncoras: carro; pneu; calibragem.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Calibragem (4 pneus)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de válvula (unidade)', 'fixed', 'unidade', 25,
       'Duração: 10-20 min | Atendimento: 24h | Inclui: troca | Não inclui: válvula (se necessário) | Âncoras: pneu; válvula.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de válvula (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Remendo de pneu de moto', 'fixed', 'serviço', 45,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: reparo | Observações: varia por roda | Âncoras: moto; pneu; furo.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Remendo de pneu de moto');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo de câmara de ar (moto/bike)', 'fixed', 'serviço', 35,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: remendo | Âncoras: moto; bike; câmara de ar.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo de câmara de ar (moto/bike)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de câmara de ar (moto/bike)', 'fixed', 'serviço', 60,
       'Duração: 20-45 min | Atendimento: 24h | Inclui: troca | Não inclui: câmara de ar | Âncoras: moto; bike; câmara de ar.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de câmara de ar (moto/bike)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Montagem de pneu (roda)', 'fixed', 'roda', 35,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: montagem/desmontagem simples | Âncoras: carro; pneu; roda.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Montagem de pneu (roda)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Desmontagem de pneu (roda)', 'fixed', 'roda', 30,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: desmontagem | Âncoras: carro; pneu; roda.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Desmontagem de pneu (roda)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Conserto furo lento (diagnóstico + reparo)', 'fixed', 'serviço', 90,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: localizar vazamento e reparar | Âncoras: carro; pneu; furo lento.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Conserto furo lento (diagnóstico + reparo)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Pneu rasgado (avaliação + solução)', 'fixed', 'visita', 120,
       'Duração: 20-60 min | Atendimento: 24h | Inclui: avaliação e solução emergencial | Observações: pode exigir pneu novo | Âncoras: carro; pneu rasgado.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Pneu rasgado (avaliação + solução)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Socorro em garagem/condomínio (deslocamento)', 'fixed', 'chamado', 80,
       'Duração: 0 min | Atendimento: 24h | Inclui: deslocamento | Observações: pode ser abatido do serviço | Âncoras: carro; pneu; garagem.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Socorro em garagem/condomínio (deslocamento)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, '“Pneu murcho” (atendimento rápido)', 'fixed', 'chamado', 80,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: diagnóstico e calibragem | Observações: se houver furo vira reparo | Âncoras: carro; pneu murcho.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = '“Pneu murcho” (atendimento rápido)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, '“Pneu furou na estrada” (taxa deslocamento)', 'fixed', 'chamado', 120,
       'Duração: 0 min | Atendimento: 24h | Inclui: deslocamento rodovia | Observações: pode variar por km e horário | Âncoras: carro; rodovia; pneu furou.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = '“Pneu furou na estrada” (taxa deslocamento)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Selante emergencial (aplicação)', 'fixed', 'serviço', 70,
       'Duração: 15-30 min | Atendimento: 24h | Inclui: aplicação de selante | Observações: solução temporária | Âncoras: carro; selante; pneu.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Selante emergencial (aplicação)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Rodízio de pneus (4 rodas)', 'fixed', 'serviço', 80,
       'Duração: 30-60 min | Atendimento: 24h | Inclui: rodízio e reaperto | Observações: sem balanceamento | Âncoras: carro; rodízio; pneus.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Rodízio de pneus (4 rodas)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de estepe no suporte (se aplicável)', 'fixed', 'serviço', 60,
       'Duração: 10-25 min | Atendimento: 24h | Inclui: fixação | Âncoras: carro; estepe.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de estepe no suporte (se aplicável)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de roda travada (parafuso espanado – tentativa)', 'fixed', 'serviço', 160,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: tentativa de remoção | Observações: pode exigir ferramental especial | Âncoras: carro; roda; parafuso espanado.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de roda travada (parafuso espanado – tentativa)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento 24h (taxa base)', 'fixed', 'chamado', 90,
       'Duração: 0 min | Atendimento: 24h | Inclui: taxa base fora de horário | Observações: pode ser abatida do serviço conforme combinado.',
       true
FROM public.professions p
WHERE p.name = 'Borracheiro 24h (Socorro)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento 24h (taxa base)');

-- -------------------------------------------------------------------
-- Tasks: Guincho / Reboque 24h — 20+
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Guincho (saída/chamado)', 'fixed', 'chamado', 180,
       'Duração: 0 min | Atendimento: 24h | Inclui: saída do guincho | Observações: km é cobrado à parte | Âncoras: carro; guincho; pane.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Guincho (saída/chamado)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Guincho leve (até 10 km)', 'fixed', 'pacote', 280,
       'Duração: por distância | Atendimento: 24h | Inclui: saída + até 10 km | Observações: excedente por km | Âncoras: carro; guincho; km.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Guincho leve (até 10 km)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Guincho por km (carro)', 'per_unit', 'km', 7,
       'Duração: por distância | Atendimento: 24h | Inclui: cobrança por km | Observações: ida/volta pode ser cobrada | Âncoras: carro; guincho; km.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Guincho por km (carro)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reboque de moto (saída)', 'fixed', 'chamado', 120,
       'Duração: 0 min | Atendimento: 24h | Inclui: saída | Observações: km à parte | Âncoras: moto; reboque; guincho.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reboque de moto (saída)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reboque por km (moto)', 'per_unit', 'km', 5,
       'Duração: por distância | Atendimento: 24h | Inclui: cobrança por km | Âncoras: moto; km; reboque.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reboque por km (moto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Transporte para oficina indicada', 'fixed', 'serviço', 250,
       'Duração: por distância | Atendimento: 24h | Inclui: transporte até oficina | Observações: km pode alterar | Âncoras: carro; oficina; guincho.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Transporte para oficina indicada');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Transporte para casa', 'fixed', 'serviço', 250,
       'Duração: por distância | Atendimento: 24h | Inclui: transporte até residência | Observações: km pode alterar | Âncoras: carro; casa; guincho.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Transporte para casa');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Remoção de garagem (carro sem ligar)', 'fixed', 'serviço', 300,
       'Duração: 30-90 min | Atendimento: 24h | Inclui: manobra/remoção | Observações: pode exigir patins/equipamento | Âncoras: carro; garagem; não liga.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Remoção de garagem (carro sem ligar)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Pane seca (remoção até posto/oficina)', 'fixed', 'serviço', 280,
       'Duração: por distância | Atendimento: 24h | Inclui: remoção | Observações: não inclui combustível | Âncoras: carro; pane seca; posto.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Pane seca (remoção até posto/oficina)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Carro atolado (resgate simples)', 'fixed', 'serviço', 320,
       'Duração: 30-120 min | Atendimento: 24h | Inclui: resgate simples | Observações: lama/areia podem exigir equipamento extra | Âncoras: carro; atolado; resgate.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Carro atolado (resgate simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Carro em vala (resgate simples)', 'fixed', 'serviço', 380,
       'Duração: 60-180 min | Atendimento: 24h | Inclui: resgate simples | Observações: pode exigir guincho plataforma | Âncoras: carro; vala; resgate.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Carro em vala (resgate simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Bateria arriada (transporte)', 'fixed', 'serviço', 260,
       'Duração: por distância | Atendimento: 24h | Inclui: transporte | Observações: não inclui bateria/recarga | Âncoras: carro; bateria; não liga.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Bateria arriada (transporte)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de pneu impossível (reboque)', 'fixed', 'serviço', 260,
       'Duração: por distância | Atendimento: 24h | Inclui: reboque | Observações: recomendado quando não há estepe | Âncoras: carro; pneu; reboque.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de pneu impossível (reboque)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acidente leve (remoção)', 'fixed', 'serviço', 350,
       'Duração: 30-120 min | Atendimento: 24h | Inclui: remoção do veículo | Observações: autoridade/local pode influenciar | Âncoras: acidente; guincho.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acidente leve (remoção)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Transporte de veículo sem chave (condicional)', 'fixed', 'serviço', 420,
       'Duração: por distância | Atendimento: 24h | Inclui: transporte com condições | Observações: pode exigir liberação/documento | Âncoras: carro; sem chave; guincho.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Transporte de veículo sem chave (condicional)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento noturno (adicional)', 'fixed', 'adicional', 120,
       'Duração: 0 min | Atendimento: 24h | Inclui: adicional noturno | Observações: some ao valor base.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento noturno (adicional)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Atendimento em rodovia (adicional)', 'fixed', 'adicional', 150,
       'Duração: 0 min | Atendimento: 24h | Inclui: adicional rodovia | Observações: some ao valor base.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Atendimento em rodovia (adicional)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Guincho plataforma (se houver)', 'fixed', 'chamado', 260,
       'Duração: 0 min | Atendimento: 24h | Inclui: plataforma | Observações: disponibilidade do equipamento.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Guincho plataforma (se houver)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Guincho para SUV/pickup (se houver)', 'fixed', 'chamado', 240,
       'Duração: 0 min | Atendimento: 24h | Inclui: veículo maior | Observações: pode ter tarifa diferenciada.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Guincho para SUV/pickup (se houver)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Agendamento (não emergência)', 'fixed', 'serviço', 200,
       'Duração: por distância | Atendimento: agendado | Inclui: transporte agendado | Observações: normalmente mais barato que 24h.',
       true
FROM public.professions p
WHERE p.name = 'Guincho / Reboque 24h'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Agendamento (não emergência)');
