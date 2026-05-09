-- Seed: Afazeres Domésticos + Serviços Pessoais (MA/TO/PA)
-- Populates public.professions (on_site) and public.task_catalog with realistic task names,
-- typical prices, and typical duration/range encoded in task_catalog.keywords.
--
-- Idempotent: uses WHERE NOT EXISTS per profession/task.

-- -------------------------------------------------------------------
-- Professions (on_site)
-- -------------------------------------------------------------------

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Marido de Aluguel / Faz-tudo', 'on_site',
       'pequenos reparos; instalação; fixação; prateleira; suporte tv; varão; cortina; varal; vedação; silicone; porta; dobradiça; quadro; espelho; torneira; sifão; assento',
       85
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Marido de Aluguel / Faz-tudo');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Técnico de Portão Eletrônico', 'on_site',
       'portão eletrônico; automatizador; motor; placa; central; capacitor; sensor; fotocélula; controle; trilho; roldana; rolamento; cremalheira; botoeira; interfone; manutenção',
       75
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Técnico de Portão Eletrônico');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Babá / Cuidador Infantil', 'on_site',
       'babá; cuidador infantil; criança; bebê; rotina; escola; evento; fim de semana; noturno; pernoite; acompanhamento; alimentação; higiene',
       70
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Babá / Cuidador Infantil');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Segurança Privada', 'on_site',
       'segurança; vigilante; patrimonial; evento; ronda; porteiro; controle de acesso; escolta leve; obra; comércio; condomínio; noturno',
       65
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Segurança Privada');

INSERT INTO public.professions (name, service_type, keywords, popularity_score)
SELECT 'Entregador / Motoboy (Delivery)', 'on_site',
       'motoboy; entrega; delivery; retirada; encomenda; documento; comida; farmácia; coleta; paradas; km; retorno; comprovante; noturno; expresso',
       70
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Entregador / Motoboy (Delivery)');

-- -------------------------------------------------------------------
-- Tasks: Marido de Aluguel / Faz-tudo — 20
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de lâmpada (simples)', 'fixed', 'serviço', 40,
       'Duração: 10-25 min | Faixa: R$ 30-70 | Inclui: mão de obra e teste | Não inclui: lâmpada/soquete | Observações: altura e acesso podem alterar o tempo | Âncoras: marido de aluguel; faz-tudo; lâmpada; bocal; iluminação.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de lâmpada (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de varão de cortina', 'fixed', 'serviço', 90,
       'Duração: 30-60 min | Faixa: R$ 70-140 | Inclui: furação e fixação | Não inclui: varão/suportes | Observações: parede (alvenaria/azulejo) influencia | Âncoras: varão; cortina; furação; bucha; parafuso.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de varão de cortina');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de suporte de TV (até 55")', 'fixed', 'serviço', 160,
       'Duração: 40-90 min | Faixa: R$ 120-250 | Inclui: marcação, furação e nivelamento | Não inclui: suporte | Observações: drywall pode exigir bucha específica | Âncoras: suporte tv; parede; nível; furar.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de suporte de TV (até 55")');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Fixação de prateleira (unidade)', 'fixed', 'unidade', 70,
       'Duração: 20-45 min | Faixa: R$ 50-120 | Inclui: furação e fixação | Não inclui: prateleira/suportes | Observações: preço por unidade | Âncoras: prateleira; suporte; bucha; parafuso.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Fixação de prateleira (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Montagem de ventilador de parede (simples)', 'fixed', 'serviço', 120,
       'Duração: 40-80 min | Faixa: R$ 90-180 | Inclui: fixação e testes básicos | Não inclui: ventilador/material elétrico | Observações: sem alteração de fiação embutida | Âncoras: ventilador; parede; fixação; parafuso.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Montagem de ventilador de parede (simples)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de espelho (banheiro/quarto)', 'fixed', 'serviço', 110,
       'Duração: 30-60 min | Faixa: R$ 80-170 | Inclui: fixação e nivelamento | Não inclui: espelho | Observações: pode usar silicone/suportes conforme o caso | Âncoras: espelho; banheiro; fixação; silicone.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de espelho (banheiro/quarto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de quadro/decoração (até 3 unidades)', 'fixed', 'serviço', 80,
       'Duração: 20-45 min | Faixa: R$ 60-130 | Inclui: marcação e furação | Não inclui: molduras/suportes especiais | Observações: até 3 unidades | Âncoras: quadro; decoração; furar parede; bucha.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de quadro/decoração (até 3 unidades)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ajuste de porta “pegando” (alinhamento básico)', 'fixed', 'serviço', 95,
       'Duração: 30-60 min | Faixa: R$ 70-160 | Inclui: ajuste de dobradiça/fecho | Não inclui: troca de peça | Observações: pode exigir calço e reaperto | Âncoras: porta; alinhamento; dobradiça; fechadura.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ajuste de porta “pegando” (alinhamento básico)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de dobradiça (unidade)', 'fixed', 'unidade', 70,
       'Duração: 20-40 min | Faixa: R$ 50-120 | Inclui: substituição e ajuste | Não inclui: dobradiça | Observações: preço por unidade | Âncoras: dobradiça; porta; ajuste.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de dobradiça (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de fechadura interna simples', 'fixed', 'serviço', 140,
       'Duração: 45-90 min | Faixa: R$ 110-220 | Inclui: instalação e testes | Não inclui: fechadura | Observações: serviço residencial simples (não inclui abertura emergencial) | Âncoras: fechadura; maçaneta; porta; instalação.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de fechadura interna simples');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de olho mágico', 'fixed', 'serviço', 120,
       'Duração: 20-40 min | Faixa: R$ 90-180 | Inclui: furação e instalação | Não inclui: olho mágico | Observações: compatível com espessura da porta | Âncoras: olho mágico; porta; furo.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de olho mágico');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de varal de parede', 'fixed', 'serviço', 120,
       'Duração: 40-80 min | Faixa: R$ 90-200 | Inclui: furação e fixação | Não inclui: varal | Observações: parede e distância influenciam | Âncoras: varal; lavanderia; furo; bucha.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de varal de parede');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de suporte de micro-ondas', 'fixed', 'serviço', 130,
       'Duração: 40-80 min | Faixa: R$ 100-210 | Inclui: fixação e nivelamento | Não inclui: suporte | Observações: atenção ao peso e tipo de parede | Âncoras: micro-ondas; suporte; cozinha; prateleira.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de suporte de micro-ondas');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Vedação com silicone (box/pia)', 'fixed', 'serviço', 90,
       'Duração: 30-60 min | Faixa: R$ 70-150 | Inclui: remoção básica do silicone velho e aplicação | Não inclui: silicone especial/material | Observações: cura do silicone pode levar horas | Âncoras: silicone; box; pia; infiltração; vazamento.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Vedação com silicone (box/pia)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de assento sanitário', 'fixed', 'serviço', 60,
       'Duração: 15-30 min | Faixa: R$ 40-100 | Inclui: instalação e ajuste | Não inclui: assento | Observações: compatibilidade do modelo | Âncoras: assento; vaso; banheiro.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de assento sanitário');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de sifão (simples/aparente)', 'fixed', 'serviço', 95,
       'Duração: 30-60 min | Faixa: R$ 70-160 | Inclui: troca e teste de vazamento | Não inclui: sifão/peças | Observações: ponto hidráulico deve estar acessível | Âncoras: sifão; pia; vazamento; cozinha; banheiro.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de sifão (simples/aparente)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de torneira (ponto pronto)', 'fixed', 'serviço', 110,
       'Duração: 30-60 min | Faixa: R$ 80-180 | Inclui: instalação e vedação | Não inclui: torneira/peças | Observações: ponto deve estar pronto e sem vazamento oculto | Âncoras: torneira; cozinha; banheiro; vedação.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de torneira (ponto pronto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Regulagem de janela/trinco', 'fixed', 'serviço', 90,
       'Duração: 30-60 min | Faixa: R$ 70-150 | Inclui: ajuste e reaperto | Não inclui: troca de peças grandes | Observações: pode exigir alinhamento de folha | Âncoras: janela; trinco; ajuste; alumínio.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Regulagem de janela/trinco');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de kit banheiro (toalheiro/papeleira)', 'fixed', 'serviço', 110,
       'Duração: 30-60 min | Faixa: R$ 80-180 | Inclui: furação e fixação | Não inclui: kit | Observações: azulejo exige cuidado na perfuração | Âncoras: toalheiro; papeleira; banheiro; azulejo.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de kit banheiro (toalheiro/papeleira)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Visita técnica (pequenos reparos)', 'fixed', 'visita', 80,
       'Duração: 0 min | Faixa: R$ 60-120 | Inclui: diagnóstico no local e orientação | Não inclui: execução de serviços extras | Observações: pode ser abatido se fechar o serviço | Âncoras: visita; orçamento; reparo.',
       true
FROM public.professions p
WHERE p.name = 'Marido de Aluguel / Faz-tudo'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Visita técnica (pequenos reparos)');

-- -------------------------------------------------------------------
-- Tasks: Técnico de Portão Eletrônico — 20
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Visita/diagnóstico portão eletrônico', 'fixed', 'visita', 120,
       'Duração: 0 min | Faixa: R$ 90-180 | Inclui: diagnóstico e testes básicos | Não inclui: peças | Observações: orçamento no local | Âncoras: portão; automatizador; motor; diagnóstico.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Visita/diagnóstico portão eletrônico');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ajuste de fim de curso', 'fixed', 'serviço', 160,
       'Duração: 30-60 min | Faixa: R$ 120-240 | Inclui: regulagem e testes | Não inclui: troca de componentes | Observações: melhora parada e alinhamento | Âncoras: fim de curso; regulagem; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ajuste de fim de curso');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de capacitor (mão de obra)', 'fixed', 'serviço', 180,
       'Duração: 30-60 min | Faixa: R$ 140-280 | Inclui: substituição e testes | Não inclui: capacitor | Observações: sintomas comuns: portão sem força | Âncoras: capacitor; motor; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de capacitor (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de placa de comando (mão de obra)', 'fixed', 'serviço', 220,
       'Duração: 60-120 min | Faixa: R$ 180-320 | Inclui: instalação e configuração básica | Não inclui: placa | Observações: pode exigir reprogramar controles | Âncoras: placa; central; comando; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de placa de comando (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Configuração de controle remoto (até 2)', 'fixed', 'serviço', 130,
       'Duração: 20-40 min | Faixa: R$ 100-200 | Inclui: cadastro e teste (até 2) | Não inclui: controles | Observações: compatibilidade do receptor | Âncoras: controle; cadastro; clonagem; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Configuração de controle remoto (até 2)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cópia/cadastro de controle adicional (unidade)', 'fixed', 'unidade', 35,
       'Duração: 10-20 min | Faixa: R$ 25-60 | Inclui: cadastro de 1 controle | Não inclui: controle | Observações: preço por unidade | Âncoras: controle; portão; cadastro.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cópia/cadastro de controle adicional (unidade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de sensor/fotocélula (mão de obra)', 'fixed', 'serviço', 160,
       'Duração: 30-60 min | Faixa: R$ 120-260 | Inclui: troca e alinhamento do sensor | Não inclui: sensor | Observações: evita fechamento sobre obstáculos | Âncoras: sensor; fotocélula; segurança; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de sensor/fotocélula (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Reparo de fiação do motor (trecho curto)', 'fixed', 'serviço', 180,
       'Duração: 40-90 min | Faixa: R$ 140-280 | Inclui: correção de fiação aparente e testes | Não inclui: troca de motor | Observações: curto/intermitência | Âncoras: fiação; curto; motor; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Reparo de fiação do motor (trecho curto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Lubrificação e ajuste de trilho (manutenção)', 'fixed', 'serviço', 150,
       'Duração: 40-80 min | Faixa: R$ 120-240 | Inclui: limpeza leve e lubrificação | Não inclui: troca de peças | Observações: reduz ruído e travamento | Âncoras: trilho; rolamento; lubrificação; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Lubrificação e ajuste de trilho (manutenção)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de roldana/rolamento (mão de obra)', 'fixed', 'serviço', 180,
       'Duração: 60-120 min | Faixa: R$ 140-300 | Inclui: substituição e ajustes | Não inclui: roldana/rolamento | Observações: pode exigir desmontagem parcial | Âncoras: roldana; rolamento; ruído; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de roldana/rolamento (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Portão não abre (atendimento)', 'fixed', 'serviço', 180,
       'Duração: 40-120 min | Faixa: R$ 140-320 | Inclui: tentativa de liberação e correção simples | Não inclui: peças grandes | Observações: pode ser falha elétrica/mecânica | Âncoras: portão não abre; travado; motor; placa.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Portão não abre (atendimento)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Portão abrindo sozinho (diagnóstico)', 'fixed', 'serviço', 160,
       'Duração: 30-90 min | Faixa: R$ 120-260 | Inclui: testes de comando e receptor | Não inclui: troca de placa | Observações: pode ser interferência/controle travado | Âncoras: portão abre sozinho; interferência; controle; receptor.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Portão abrindo sozinho (diagnóstico)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ajuste de força/embreagem (quando aplicável)', 'fixed', 'serviço', 170,
       'Duração: 40-80 min | Faixa: R$ 130-270 | Inclui: regulagem e testes | Não inclui: troca de peças | Observações: evita travamento e esforço excessivo | Âncoras: força; embreagem; regulagem; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ajuste de força/embreagem (quando aplicável)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de cremalheira (mão de obra)', 'fixed', 'serviço', 250,
       'Duração: 90-150 min | Faixa: R$ 200-380 | Inclui: instalação e alinhamento | Não inclui: cremalheira | Observações: desgaste causa "pulos" no portão | Âncoras: cremalheira; alinhamento; portão deslizante.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de cremalheira (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de motor (mão de obra)', 'fixed', 'serviço', 350,
       'Duração: 120-180 min | Faixa: R$ 300-500 | Inclui: substituição e testes | Não inclui: motor/automatizador | Observações: pode exigir ajustes de trilho e cremalheira | Âncoras: motor; automatizador; troca; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de motor (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de automatizador (mão de obra)', 'fixed', 'serviço', 450,
       'Duração: 180-300 min | Faixa: R$ 400-650 | Inclui: instalação e configuração básica | Não inclui: automatizador/materiais | Observações: exige avaliação do portão e estrutura | Âncoras: instalação; automatizador; motor; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de automatizador (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Instalação de botoeira interna', 'fixed', 'serviço', 140,
       'Duração: 30-60 min | Faixa: R$ 110-220 | Inclui: instalação e teste | Não inclui: botoeira/materiais | Observações: pode precisar canaleta aparente | Âncoras: botoeira; botão; acionamento; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Instalação de botoeira interna');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Integração com interfone (quando possível)', 'fixed', 'serviço', 220,
       'Duração: 60-120 min | Faixa: R$ 180-350 | Inclui: integração e testes | Não inclui: troca de interfone/placa | Observações: depende do modelo do interfone e central | Âncoras: interfone; integração; portão; acionamento.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Integração com interfone (quando possível)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca de fonte/transformador (mão de obra)', 'fixed', 'serviço', 180,
       'Duração: 40-80 min | Faixa: R$ 140-280 | Inclui: substituição e testes | Não inclui: fonte/transformador | Observações: falha pode causar portão intermitente | Âncoras: fonte; transformador; energia; portão.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca de fonte/transformador (mão de obra)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Revisão preventiva portão eletrônico', 'fixed', 'serviço', 220,
       'Duração: 60-120 min | Faixa: R$ 180-350 | Inclui: check-list, ajustes e testes | Não inclui: peças | Observações: recomendado para reduzir falhas | Âncoras: revisão; manutenção; portão; prevenção.',
       true
FROM public.professions p
WHERE p.name = 'Técnico de Portão Eletrônico'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Revisão preventiva portão eletrônico');

-- -------------------------------------------------------------------
-- Tasks: Babá / Cuidador Infantil — 20
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá por hora (diurna)', 'per_unit', 'hora', 25,
       'Duração: por hora | Faixa: R$ 20-35 | Inclui: cuidados básicos e supervisão | Não inclui: tarefas domésticas pesadas | Observações: valor por hora | Âncoras: babá; criança; diurna; cuidar.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá por hora (diurna)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá noturna por hora', 'per_unit', 'hora', 30,
       'Duração: por hora | Faixa: R$ 25-45 | Inclui: supervisão noturna e rotina do sono | Não inclui: pernoite/pacote | Observações: valor por hora | Âncoras: babá; noturno; noite; criança.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá noturna por hora');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá diária (até 8h)', 'per_unit', 'diária', 180,
       'Duração: 8h | Faixa: R$ 140-260 | Inclui: turno de até 8 horas | Não inclui: horas extras | Observações: diária; pode ajustar por número de crianças | Âncoras: babá; diária; turno; 8h.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá diária (até 8h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá para evento (por hora)', 'per_unit', 'hora', 30,
       'Duração: por hora | Faixa: R$ 25-50 | Inclui: supervisão durante evento | Não inclui: transporte | Observações: festas e eventos | Âncoras: babá; evento; festa; criança.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá para evento (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acompanhamento em consulta/saída (por hora)', 'per_unit', 'hora', 28,
       'Duração: por hora | Faixa: R$ 22-40 | Inclui: acompanhamento e supervisão | Não inclui: transporte | Observações: consulta médica, passeio, compromisso | Âncoras: acompanhar; consulta; saída; criança.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acompanhamento em consulta/saída (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cuidar de bebê (0–12m) por hora', 'per_unit', 'hora', 32,
       'Duração: por hora | Faixa: R$ 26-50 | Inclui: cuidados com bebê e rotina | Não inclui: serviços domésticos | Observações: recém-nascido pode ter valor maior | Âncoras: bebê; recém-nascido; mamadeira; fralda.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cuidar de bebê (0–12m) por hora');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Apoio com rotina escolar (por hora)', 'per_unit', 'hora', 26,
       'Duração: por hora | Faixa: R$ 22-38 | Inclui: supervisão de tarefas e rotina | Não inclui: reforço escolar especializado | Observações: ajuda no dever e organização | Âncoras: escola; tarefa; dever; rotina.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Apoio com rotina escolar (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá fim de semana (por hora)', 'per_unit', 'hora', 30,
       'Duração: por hora | Faixa: R$ 25-50 | Inclui: supervisão e cuidados | Não inclui: pernoite | Observações: sábado/domingo e feriados | Âncoras: fim de semana; sábado; domingo; babá.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá fim de semana (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Babá pernoite (pacote)', 'fixed', 'noite', 220,
       'Duração: 10-12h | Faixa: R$ 180-320 | Inclui: acompanhamento durante a noite | Não inclui: turno extra após o horário | Observações: pernoite; pode variar por idade e rotina | Âncoras: pernoite; babá; noite; dormir.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Babá pernoite (pacote)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Cuidador infantil (2 crianças) adicional', 'per_unit', 'hora', 35,
       'Duração: por hora | Faixa: R$ 28-55 | Inclui: cuidado com 2 crianças | Não inclui: tarefas domésticas | Observações: valor por hora; depende da idade | Âncoras: duas crianças; irmãos; babá.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Cuidador infantil (2 crianças) adicional');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Preparar refeição simples da criança', 'fixed', 'serviço', 40,
       'Duração: 20-40 min | Faixa: R$ 30-80 | Inclui: preparo simples e organização básica | Não inclui: compras/ingredientes | Observações: refeição leve | Âncoras: alimentação; lanche; criança; comida.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Preparar refeição simples da criança');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Troca + higiene (apoio)', 'fixed', 'serviço', 40,
       'Duração: 20-40 min | Faixa: R$ 30-80 | Inclui: apoio de higiene e troca | Não inclui: cuidados médicos | Observações: serviço de apoio pontual | Âncoras: fralda; higiene; banho; bebê.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Troca + higiene (apoio)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Supervisão de sono (por hora)', 'per_unit', 'hora', 28,
       'Duração: por hora | Faixa: R$ 22-42 | Inclui: supervisão e rotina do sono | Não inclui: pernoite/pacote | Observações: valor por hora | Âncoras: sono; dormir; noite; criança.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Supervisão de sono (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Brincadeiras educativas (por hora)', 'per_unit', 'hora', 26,
       'Duração: por hora | Faixa: R$ 22-38 | Inclui: atividades lúdicas e supervisão | Não inclui: aula particular | Observações: conforme idade | Âncoras: brincadeira; educativo; criança; recreação.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Brincadeiras educativas (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Buscar na escola (apoio)', 'fixed', 'serviço', 60,
       'Duração: 30-60 min | Faixa: R$ 50-120 | Inclui: buscar e entregar ao responsável | Não inclui: transporte/combustível | Observações: rotas longas podem alterar | Âncoras: buscar; escola; criança; saída.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Buscar na escola (apoio)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Levar na escola (apoio)', 'fixed', 'serviço', 60,
       'Duração: 30-60 min | Faixa: R$ 50-120 | Inclui: levar e entregar na escola | Não inclui: transporte/combustível | Observações: horários e distância influenciam | Âncoras: levar; escola; criança; manhã.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Levar na escola (apoio)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acompanhamento em casa (turno 4h)', 'fixed', 'turno', 120,
       'Duração: 4h | Faixa: R$ 100-180 | Inclui: acompanhamento e supervisão | Não inclui: horas extras | Observações: turno de 4 horas | Âncoras: turno; 4h; babá; casa.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acompanhamento em casa (turno 4h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acompanhamento em casa (turno 6h)', 'fixed', 'turno', 150,
       'Duração: 6h | Faixa: R$ 120-220 | Inclui: acompanhamento e supervisão | Não inclui: horas extras | Observações: turno de 6 horas | Âncoras: turno; 6h; babá; casa.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acompanhamento em casa (turno 6h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acompanhamento em casa (turno 8h)', 'fixed', 'turno', 180,
       'Duração: 8h | Faixa: R$ 140-260 | Inclui: acompanhamento e supervisão | Não inclui: horas extras | Observações: turno de 8 horas | Âncoras: turno; 8h; babá; casa.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acompanhamento em casa (turno 8h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Taxa de urgência (mesmo dia)', 'fixed', 'serviço', 50,
       'Duração: 0 min | Faixa: R$ 40-90 | Inclui: prioridade/encaixe | Não inclui: o serviço em si | Observações: aplicável quando solicitado para o mesmo dia | Âncoras: urgência; encaixe; hoje; babá.',
       true
FROM public.professions p
WHERE p.name = 'Babá / Cuidador Infantil'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Taxa de urgência (mesmo dia)');

-- -------------------------------------------------------------------
-- Tasks: Segurança Privada — 20
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança por hora (posto)', 'per_unit', 'hora', 45,
       'Duração: por hora | Faixa: R$ 35-65 | Inclui: vigilância no local | Não inclui: armamento/equipamentos especiais | Observações: valor por hora | Âncoras: segurança; vigilante; posto; patrimonial.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança por hora (posto)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança noturno por hora', 'per_unit', 'hora', 55,
       'Duração: por hora | Faixa: R$ 45-80 | Inclui: vigilância noturna | Não inclui: escolta armada | Observações: valor por hora; noite | Âncoras: segurança; noturno; vigilante; noite.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança noturno por hora');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para evento (por hora)', 'per_unit', 'hora', 55,
       'Duração: por hora | Faixa: R$ 45-85 | Inclui: controle e vigilância em evento | Não inclui: equipe múltipla | Observações: valor por hora; eventos e festas | Âncoras: evento; festa; segurança; portaria.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para evento (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para festa pequena (pacote 4h)', 'fixed', 'pacote', 220,
       'Duração: 4h | Faixa: R$ 180-320 | Inclui: 1 profissional por 4 horas | Não inclui: equipe extra | Observações: pacote 4h | Âncoras: festa; evento; 4h; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para festa pequena (pacote 4h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para festa média (pacote 6h)', 'fixed', 'pacote', 320,
       'Duração: 6h | Faixa: R$ 260-460 | Inclui: 1 profissional por 6 horas | Não inclui: equipe extra | Observações: pacote 6h | Âncoras: festa; evento; 6h; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para festa média (pacote 6h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para festa (pacote 8h)', 'fixed', 'pacote', 420,
       'Duração: 8h | Faixa: R$ 340-600 | Inclui: 1 profissional por 8 horas | Não inclui: equipe extra | Observações: pacote 8h | Âncoras: festa; evento; 8h; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para festa (pacote 8h)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Porteiro temporário (por hora)', 'per_unit', 'hora', 40,
       'Duração: por hora | Faixa: R$ 30-55 | Inclui: controle de entrada/saída | Não inclui: vigilância armada | Observações: condomínios e portaria | Âncoras: porteiro; portaria; condomínio; acesso.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Porteiro temporário (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Controle de acesso (por hora)', 'per_unit', 'hora', 45,
       'Duração: por hora | Faixa: R$ 35-65 | Inclui: controle de entrada e triagem | Não inclui: revista especializada | Observações: valor por hora | Âncoras: controle de acesso; entrada; portaria; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Controle de acesso (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ronda em residência (visita)', 'fixed', 'visita', 120,
       'Duração: 30-60 min | Faixa: R$ 90-180 | Inclui: ronda e verificação básica | Não inclui: monitoramento 24h | Observações: rota e distância podem influenciar | Âncoras: ronda; residência; segurança; vigilância.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ronda em residência (visita)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Ronda em comércio (visita)', 'fixed', 'visita', 140,
       'Duração: 30-60 min | Faixa: R$ 110-220 | Inclui: verificação e ronda | Não inclui: permanência no local | Observações: para lojas e comércios | Âncoras: ronda; comércio; loja; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Ronda em comércio (visita)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Acompanhamento “leva e traz” (por hora)', 'per_unit', 'hora', 60,
       'Duração: por hora | Faixa: R$ 45-90 | Inclui: acompanhamento presencial (escolta leve) | Não inclui: transporte/veículo | Observações: indicado para deslocamentos curtos e segurança pessoal | Âncoras: acompanhamento; escolta leve; leva e traz; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Acompanhamento “leva e traz” (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança em obra (por hora)', 'per_unit', 'hora', 45,
       'Duração: por hora | Faixa: R$ 35-70 | Inclui: vigilância em obra | Não inclui: rondas externas longas | Observações: valor por hora | Âncoras: obra; canteiro; vigilante; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança em obra (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança 12h (diária)', 'per_unit', 'diária', 520,
       'Duração: 12h | Faixa: R$ 420-720 | Inclui: 1 profissional por 12 horas | Não inclui: equipe adicional | Observações: diária 12h | Âncoras: 12h; diária; vigilante; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança 12h (diária)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança 8h (diária)', 'per_unit', 'diária', 420,
       'Duração: 8h | Faixa: R$ 340-600 | Inclui: 1 profissional por 8 horas | Não inclui: horas extras | Observações: diária 8h | Âncoras: 8h; diária; vigilante; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança 8h (diária)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança 4h (diária)', 'per_unit', 'diária', 220,
       'Duração: 4h | Faixa: R$ 180-320 | Inclui: 1 profissional por 4 horas | Não inclui: horas extras | Observações: diária 4h | Âncoras: 4h; diária; vigilante; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança 4h (diária)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Taxa deslocamento (bairro distante)', 'fixed', 'serviço', 40,
       'Duração: 0 min | Faixa: R$ 30-70 | Inclui: deslocamento extra | Não inclui: o serviço principal | Observações: pode variar por distância | Âncoras: deslocamento; taxa; distância; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Taxa deslocamento (bairro distante)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para fechamento de caixa (por hora)', 'per_unit', 'hora', 60,
       'Duração: por hora | Faixa: R$ 45-95 | Inclui: acompanhamento no fechamento/rotina | Não inclui: transporte | Observações: indicado para comércio | Âncoras: fechamento de caixa; comércio; segurança; acompanhamento.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para fechamento de caixa (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança para entrega de alto valor (por hora)', 'per_unit', 'hora', 65,
       'Duração: por hora | Faixa: R$ 50-110 | Inclui: acompanhamento e vigilância | Não inclui: escolta armada | Observações: entrega e deslocamento curto | Âncoras: entrega alto valor; acompanhamento; segurança; escolta leve.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança para entrega de alto valor (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Segurança em porta de loja (por hora)', 'per_unit', 'hora', 45,
       'Duração: por hora | Faixa: R$ 35-70 | Inclui: presença e prevenção | Não inclui: equipe extra | Observações: valor por hora | Âncoras: porta de loja; comércio; vigilante; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Segurança em porta de loja (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Adicional urgência (mesmo dia)', 'fixed', 'serviço', 60,
       'Duração: 0 min | Faixa: R$ 45-100 | Inclui: prioridade/encaixe | Não inclui: o serviço em si | Observações: aplicável em solicitações de última hora | Âncoras: urgência; encaixe; hoje; segurança.',
       true
FROM public.professions p
WHERE p.name = 'Segurança Privada'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Adicional urgência (mesmo dia)');

-- -------------------------------------------------------------------
-- Tasks: Entregador / Motoboy (Delivery) — 20
-- -------------------------------------------------------------------

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Taxa de saída (retirada)', 'fixed', 'saída', 15,
       'Duração: 0 min | Faixa: R$ 10-25 | Inclui: retirada inicial | Não inclui: distância/km | Observações: pode ser somada ao valor por km | Âncoras: motoboy; retirada; saída; delivery.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Taxa de saída (retirada)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega por km', 'per_unit', 'km', 3.5,
       'Duração: por distância | Faixa: R$ 2.5-5.0 | Inclui: cobrança por km | Não inclui: taxa de saída/retirada | Observações: ida/volta pode ser cobrada conforme rota | Âncoras: km; distância; motoboy; entrega.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega por km');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega de documento (até 5 km)', 'fixed', 'entrega', 25,
       'Duração: 30-90 min | Faixa: R$ 20-40 | Inclui: retirada e entrega até 5 km | Não inclui: cartório/serviços externos | Observações: pode exigir retorno | Âncoras: documento; envelope; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega de documento (até 5 km)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega de encomenda pequena (até 5 km)', 'fixed', 'entrega', 28,
       'Duração: 30-90 min | Faixa: R$ 22-45 | Inclui: retirada e entrega até 5 km | Não inclui: volumes grandes/pesados | Observações: tamanho/volume influencia | Âncoras: encomenda; pacote; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega de encomenda pequena (até 5 km)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega de comida (retira e entrega)', 'fixed', 'entrega', 22,
       'Duração: 30-90 min | Faixa: R$ 18-35 | Inclui: retirada em restaurante e entrega | Não inclui: espera longa | Observações: pode variar por horário e distância | Âncoras: comida; restaurante; delivery; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega de comida (retira e entrega)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega em farmácia', 'fixed', 'entrega', 25,
       'Duração: 30-90 min | Faixa: R$ 20-40 | Inclui: retirada em farmácia e entrega | Não inclui: compra por conta própria sem autorização | Observações: pode exigir pagamento na retirada | Âncoras: farmácia; remédio; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega em farmácia');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Coleta e entrega (2 paradas)', 'fixed', 'entrega', 35,
       'Duração: 45-120 min | Faixa: R$ 28-55 | Inclui: 2 paradas (coleta + entrega) | Não inclui: espera longa | Observações: distância adicional pode ser cobrada | Âncoras: coleta; paradas; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Coleta e entrega (2 paradas)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Coleta e entrega (3 paradas)', 'fixed', 'entrega', 45,
       'Duração: 60-150 min | Faixa: R$ 38-75 | Inclui: 3 paradas | Não inclui: espera longa | Observações: rotas longas podem adicionar km | Âncoras: 3 paradas; coleta; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Coleta e entrega (3 paradas)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega expressa (prioridade)', 'fixed', 'adicional', 15,
       'Duração: 0 min | Faixa: R$ 10-30 | Inclui: prioridade na rota | Não inclui: valor base da entrega | Observações: pode depender de disponibilidade | Âncoras: expresso; prioridade; entrega rápida.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega expressa (prioridade)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega agendada', 'fixed', 'serviço', 10,
       'Duração: 0 min | Faixa: R$ 5-20 | Inclui: agendamento de horário | Não inclui: entrega em si | Observações: pode ter tolerância de janela | Âncoras: agendada; horário; entrega.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega agendada');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Retorno com comprovante', 'fixed', 'serviço', 10,
       'Duração: 10-30 min | Faixa: R$ 5-20 | Inclui: retorno com assinatura/comprovante | Não inclui: taxa base de entrega | Observações: exige recebedor no local | Âncoras: comprovante; assinatura; retorno; entrega.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Retorno com comprovante');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega em horário noturno (adicional)', 'fixed', 'adicional', 20,
       'Duração: 0 min | Faixa: R$ 15-35 | Inclui: adicional noturno | Não inclui: entrega base | Observações: após 22h/antes 6h (ajustável) | Âncoras: noturno; noite; adicional; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega em horário noturno (adicional)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Espera no local (por hora)', 'per_unit', 'hora', 25,
       'Duração: por hora | Faixa: R$ 20-40 | Inclui: espera para retirada/entrega | Não inclui: deslocamento extra | Observações: valor por hora | Âncoras: espera; aguardar; motoboy; fila.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Espera no local (por hora)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega para cartório (apoio)', 'fixed', 'entrega', 35,
       'Duração: 60-180 min | Faixa: R$ 30-60 | Inclui: levar/retirar documentos no cartório | Não inclui: taxas do cartório | Observações: pode ter espera e fila | Âncoras: cartório; documento; protocolo; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega para cartório (apoio)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega em bairro distante (adicional)', 'fixed', 'adicional', 15,
       'Duração: 0 min | Faixa: R$ 10-30 | Inclui: adicional por distância/bairro | Não inclui: entrega base | Observações: pode somar com km | Âncoras: bairro distante; adicional; distância; entrega.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega em bairro distante (adicional)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Motoboy “múltiplas entregas” (pacote 5)', 'fixed', 'pacote', 90,
       'Duração: 2-4h | Faixa: R$ 70-140 | Inclui: até 5 entregas na mesma rota | Não inclui: km excedente grande | Observações: ideal para comércios | Âncoras: múltiplas entregas; pacote; comércio; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Motoboy “múltiplas entregas” (pacote 5)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Motoboy “múltiplas entregas” (pacote 10)', 'fixed', 'pacote', 160,
       'Duração: 4-8h | Faixa: R$ 130-240 | Inclui: até 10 entregas | Não inclui: km excedente grande | Observações: ideal para rotas urbanas | Âncoras: 10 entregas; pacote; motoboy; rota.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Motoboy “múltiplas entregas” (pacote 10)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega de pequeno volume (até 10 km)', 'fixed', 'entrega', 35,
       'Duração: 45-120 min | Faixa: R$ 28-55 | Inclui: retirada e entrega até 10 km | Não inclui: volume grande/pesado | Observações: pode somar taxa por espera | Âncoras: pequeno volume; encomenda; 10 km; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega de pequeno volume (até 10 km)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega de médio volume (até 10 km)', 'fixed', 'entrega', 45,
       'Duração: 45-150 min | Faixa: R$ 38-75 | Inclui: retirada e entrega até 10 km | Não inclui: carga pesada | Observações: depende de tamanho e acesso | Âncoras: médio volume; caixa; entrega; motoboy.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega de médio volume (até 10 km)');

INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
SELECT p.id, 'Entrega “mão em mão” (assinatura)', 'fixed', 'serviço', 10,
       'Duração: 10-30 min | Faixa: R$ 5-20 | Inclui: confirmação/assinatura na entrega | Não inclui: valor base da entrega | Observações: exige recebedor e identificação | Âncoras: mão em mão; assinatura; comprovante; entrega.',
       true
FROM public.professions p
WHERE p.name = 'Entregador / Motoboy (Delivery)'
  AND NOT EXISTS (SELECT 1 FROM public.task_catalog t WHERE t.profession_id = p.id AND t.name = 'Entrega “mão em mão” (assinatura)');
