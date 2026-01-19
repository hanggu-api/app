require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

if (
  !process.env.GEMINI_API_KEY ||
  String(process.env.GEMINI_API_KEY).trim().length === 0
) {
  console.error(
    "GEMINI_API_KEY ausente no ambiente. Defina e tente novamente.",
  );
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

type SpecialistsMap = Record<string, string>;
type TaskItem = {
  nome: string;
  preco: number;
  unid: "unidade" | "m2" | "fixo";
  keys: string;
};

const ESPECIALISTAS_MAIS_100 = {
  // --- NÁUTICA E AVIAÇÃO RECREATIVA ---
  "Mecânico de Barcos / Motores de Popa":
    "Foque em revisão de motores Mercury/Yamaha, troca de rotor, limpeza de bicos e revisão de rabeta.",
  "Limpador de Cascos (Mergulhador)":
    "Foque em limpeza de cracas, polimento de costado e troca de anodos de sacrifício.",
  "Tapeceiro Náutico":
    "Foque em reforma de estofados de lanchas, capotas marítimas e carpetes náuticos.",
  "Técnico de Drones":
    "Foque em troca de braços/motores, calibração de gimbal, atualização de firmware e reparo de sensores.",

  // --- TERAPIAS E BEM-ESTAR AVANÇADO ---
  Acupunturista:
    "Foque em aplicação de agulhas para dor lombar, ansiedade, auriculoterapia e ventosaterapia.",
  Quiropraxista:
    "Foque em ajuste de coluna, alinhamento cervical e liberação miofascial.",
  "Instrutor de Yoga":
    "Foque em aulas particulares, correção de posturas (asanas) e técnicas de respiração (pranayamas).",
  Doula:
    "Foque em acompanhamento pré-parto, plano de parto e consultoria de amamentação.",
  Musicoterapeuta:
    "Foque em sessões de estimulação cognitiva e relaxamento através de instrumentos musicais.",

  // --- AGRONEGÓCIO E CAMPO ---
  "Operador de Roçadeira Pesada":
    "Foque em limpeza de pastos, aceiros contra fogo e controle de vegetação em larga escala.",
  "Técnico de Irrigação":
    "Foque em instalação de gotejadores, manutenção de bombas e automação de rega.",
  "Ferrador de Cavalos (Farrier)":
    "Foque em casqueamento, forja e aplicação de ferraduras para cavalos de passeio ou prova.",
  "Zootecnista Domiciliar":
    "Foque em consultoria de manejo animal, dietas para animais de fazenda e bem-estar.",

  // --- INDÚSTRIA E SERVIÇOS PESADOS ---
  "Soldador Especializado (TIG/MIG)":
    "Foque em soldas de precisão em alumínio, inox e estruturas metálicas pesadas.",
  "Técnico de Caldeiras":
    "Foque em inspeção de segurança, limpeza de tubulações e ajuste de queimadores.",
  "Operador de Empilhadeira":
    "Foque em movimentação de estoque, carga e descarga de camiões e organização de pallets.",
  "Técnico em Elevadores de Carga":
    "Foque em manutenção de monta-cargas, ajuste de cabos de aço e quadros de comando industrial.",
  "Montador de Andaimes":
    "Foque em montagem técnica para fachadas, torres de acesso e normas de segurança em altura.",

  // --- TECNOLOGIA E DIGITAL (AVANÇADO) ---
  "Cientista de Dados":
    "Foque em criação de dashboards, limpeza de base de dados e modelos de predição.",
  "Especialista em Cibersegurança":
    "Foque em remoção de malwares em servidores, auditoria de senhas e configuração de firewalls.",
  "Tradutor de Games / Localização":
    "Foque em adaptação cultural de textos, tradução de menus e revisão linguística de software.",
  Copywriter:
    "Foque em escrita de páginas de vendas, scripts de vídeo e anúncios persuasivos.",
  "Consultor de TI (Cloud)":
    "Foque em migração para AWS/Azure, backup na nuvem e configuração de instâncias.",

  // --- MODA E ARTESANATO ---
  Sapateiro:
    "Foque em troca de saltos, colagem de solados, hidratação de couro e alargamento de sapatos.",
  "Canteiro (Trabalho em Pedra)":
    "Foque em corte de mármores, pias de granito, polimento de pedras e restauração de túmulos.",
  "Ourives / Joalheiro":
    "Foque em ajuste de anéis, solda de correntes, polimento de joias e cravação de pedras.",
  "Artesão de Macramê":
    "Foque em painéis decorativos, suportes de plantas e caminhos de mesa sob medida.",

  // --- MANUTENÇÃO DE INSTRUMENTOS MUSICAIS (LUTHIER) ---
  "Luthier de Violão / Guitarra":
    "Foque em regulagem de oitavas, troca de trastes, colagem de cavalete e blindagem elétrica.",
  "Luthier de Sopros":
    "Foque em troca de sapatilhas de saxofone, alinhamento de chaves e limpeza química.",
  "Afinador de Pianos":
    "Foque em afinação em 440Hz, ajuste de martelos e troca de cordas partidas.",

  // --- SERVIÇOS DE LUXO E CONCIERGE ---
  "Sommelier Particular":
    "Foque em organização de adegas, curadoria de vinhos para eventos e degustação guiada.",
  "Shopper (Comprador Pessoal)":
    "Foque em compras de supermercado, presentes e itens de luxo com entrega domiciliar.",
  "Mordomo / Governança":
    "Foque em gestão de equipas domésticas, protocolo de recepção e cuidados de alto padrão.",

  // --- INFRAESTRUTURA URBANA E SEGURANÇA ---
  "Instalador de Concertina / Cerca Elétrica":
    "Foque em fixação de hastes, eletrificação de perímetro e manutenção de sirenes.",
  "Pintor de Sinalização Viária":
    "Foque em pintura de faixas de pedestres, vagas de garagem e demarcação de pátios.",
  "Técnico de Interfonia e PABX":
    "Foque em configuração de centrais de condomínio, instalação de monofones e vídeo-porteiros.",
  "Limpador de Painéis Solares":
    "Foque em limpeza técnica para aumento de eficiência e inspeção visual de placas.",

  // --- VEÍCULOS ESPECIAIS ---
  "Mecânico de Motas de Alta Cilindrada":
    "Foque em sincronização de borboletas, troca de kit transmissão e diagnóstico eletrónico.",
  "Restaurador de Carros Antigos":
    "Foque em funilaria artesanal, busca de peças raras e mecânica original.",
  "Instalador de GNV":
    "Foque em instalação de kit gás, reteste de cilindros e regulagem de pressão.",

  // --- DIVERSOS E CURIOSOS ---
  Taxidermista:
    "Foque em preservação de animais para museus ou coleção, montagem e acabamento.",
  "Detetive Particular":
    "Foque em investigação conjugal, busca de pessoas desaparecidas e levantamento de dados.",
  "Avaliador de Antiguidades":
    "Foque em autenticação de obras de arte, móveis de época e moedas raras.",
};

// União de todos os blocos para processamento

const ESPECIALISTAS_EXPANDIDO = {
  // --- CONTINUAÇÃO: MANUTENÇÃO E CONSTRUÇÃO ---
  "Serralheiro de Alumínio":
    "Foque em janelas de correr, portas de giro, venezianas e instalação de telas mosquiteiras.",
  "Técnico de Portão Eletrônico":
    "Foque em configuração de placas, troca de capacitores, cremalheiras, braços articulados e gravação de controles.",
  Telhadista:
    "Foque em limpeza de calhas, troca de telhas quebradas, aplicação de manta líquida e vedação de rufos.",
  "Marceneiro de Restauração":
    "Foque em laqueação, troca de dobradiças antigas, remoção de cupim e colagem de lâminas de madeira.",
  "Piso de Madeira / Parquet":
    "Foque em raspagem de tacos, aplicação de sinteko (verniz), calafetagem e troca de rodapés.",
  "Gesseiro Drywall":
    "Foque em divisórias de ambiente, forros modulares, nichos iluminados e tratamento de juntas.",
  "Especialista em Papel de Parede":
    "Foque em alinhamento de desenhos, aplicação em colunas, remoção de papel antigo e aplicação de cola vinílica.",

  // --- TECNOLOGIA, DESIGN E DIGITAL ---
  "Técnico de Redes":
    "Foque em crimpagem de cabos RJ45, configuração de roteadores, repetidores Wi-Fi e racks de rede.",
  "Técnico de Segurança Eletrônica":
    "Foque em instalação de câmeras IP, DVR/NVR, cercas elétricas e sensores infravermelhos.",
  "Analista de SEO":
    "Foque em otimização de sites, pesquisa de palavras-chave, ajustes de meta-tags e Google Search Console.",
  "Gestor de Redes Sociais":
    "Foque em criação de calendário editorial, postagens diárias, resposta a comentários e análise de métricas.",
  "Web Designer":
    "Foque em criação de landing pages, banners para sites, interface (UI) e experiência do usuário (UX).",
  "Desenvolvedor Mobile":
    "Foque em criação de apps para Android/iOS, correção de bugs e publicação em lojas.",
  "Técnico de Impressoras":
    "Foque em limpeza de cabeçotes, troca de toners/cartuchos, sensores de papel e correias.",

  // --- BELEZA, ESTÉTICA E SAÚDE ---
  "Designer de Sobrancelhas":
    "Foque em técnica de visagismo, aplicação de henna, depilação com linha (egípcia) e microblading.",
  "Lash Designer (Extensão de Cílios)":
    "Foque em aplicação fio a fio, volume russo, manutenção de cílios e remoção técnica.",
  Podólogo:
    "Foque em tratamento de unhas encravadas, calosidades, micose de unha e órteses ungueais.",
  "Drenagem Linfática":
    "Foque em massagem pós-operatória, redução de edema e técnicas para gestantes.",
  Tatuador:
    "Foque em traço fino (fine line), sombreamento, cobertura (cover-up) e tatuagens pequenas/médias.",
  "Body Piercer":
    "Foque em perfuração corporal, troca de jóias, assepsia e tratamento de inflamações.",

  // --- EVENTOS E ENTRETENIMENTO ---
  "Decorador de Festas":
    "Foque em montagem de arcos de balões, arranjos de mesa, painéis temáticos e iluminação de fundo.",
  DJ: "Foque em sonorização de festas, repertório musical personalizado, mixagem ao vivo e equipamentos de som.",
  "Animador de Festas":
    "Foque em recreação infantil, pintura facial, escultura em balão e personagens vivos.",
  "Mestre de Cerimônias":
    "Foque em condução de protocolos, casamentos, formaturas e eventos corporativos.",
  "Buffet a Domicílio":
    "Foque em preparo de petiscos, serviço de finger food, reposição de mesas e organização de cozinha.",
  "Barman / Bartender":
    "Foque em preparação de drinks clássicos, caipirinhas, coquetéis sem álcool e flair (malabarismo).",

  // --- ENSINO E CONSULTORIA ---
  "Professor de Violão / Guitarra":
    "Foque em aulas de acordes, leitura de partitura/tablatura, escalas e rítmica.",
  "Professor de Piano":
    "Foque em técnica clássica ou popular, postura das mãos e teoria musical.",
  "Consultor de Imagem e Estilo":
    "Foque em análise de coloração pessoal, montagem de looks e organização de closet.",
  "Organizador de Ambientes (Personal Organizer)":
    "Foque em padronização de dobras, setorização de despensas e sistemas de organização.",
  "Tradutor / Intérprete":
    "Foque em tradução de documentos, interpretação simultânea e legendagem de vídeos.",

  // --- SERVIÇOS PET ---
  "Cat Sitter (Cuidador de Gatos)":
    "Foque em limpeza de caixa de areia, alimentação, brincadeiras e administração de remédios.",
  "Adestrador Positivo":
    "Foque em treino de obediência sem punição, dessensibilização e ansiedade de separação.",
  "Banho e Tosa":
    "Foque em tosa higiênica, corte de unhas, limpeza de ouvidos e banho com produtos específicos.",

  // --- LOGÍSTICA E TRANSPORTE ---
  "Motoboy / Entregador":
    "Foque em entregas de documentos, delivery de comida, serviços de cartório e pequenas encomendas.",
  "Motorista Particular":
    "Foque em viagens intermunicipais, transporte executivo e acompanhamento de idosos/crianças.",
  "Ajudante de Mudança":
    "Foque em carregamento de peso, proteção de móveis com plástico bolha e organização no caminhão.",

  // --- MANUTENÇÃO DE EQUIPAMENTOS E INDÚSTRIA ---
  "Técnico de Balanças":
    "Foque em calibração, ajuste de precisão e troca de células de carga.",
  "Instalador de Som Profissional":
    "Foque em sonorização de igrejas, auditórios, instalação de caixas acústicas e mesas de som.",
  "Afiador de Facas / Tesouras":
    "Foque em amolação técnica, polimento de lâminas e ajuste de pressão de tesouras.",
  "Técnico de Máquina de Costura":
    "Foque em ajuste de ponto, lubrificação, troca de agulhas e sincronismo de lançadeira.",
  "Limpador de Chaminés / Dutos":
    "Foque em remoção de fuligem, gordura acumulada e inspeção de exaustores.",
  "Técnico de Elevadores":
    "Foque em manutenção preventiva, lubrificação de cabos e ajuste de nivelamento de cabine.",

  // --- SERVIÇOS DIVERSOS ---
  "Montador de Drywall":
    "Foque em perfis metálicos, placas de gesso acartonado e isolamento termoacústico.",
  "Instalador de Piso Laminado":
    "Foque em colocação de manta, encaixe click, recortes de batente e acabamento.",
  "Limpador de Piscina":
    "Foque em peneiração, aspiração de fundo, controle de pH e cloro.",
  "Controlador de Pragas":
    "Foque em descupinização, desratização e nebulização contra insetos rasteiros.",
  "Costureira / Alfaiate":
    "Foque em ajustes de barras, trocas de zíper, apertos e confecção de roupas sob medida.",
};

// Combinando com as anteriores para garantir as 100+

const ESPECIALISTAS = {
  // --- MANUTENÇÃO E REFORMAS ---
  Encanador:
    "Foque em vazamentos, desentupimentos, instalação de louças (pias, vasos) e manutenção de caixas d'água e válvulas de descarga.",
  Eletricista:
    "Foque em pontos de luz/tomada, troca de disjuntores, resistências de chuveiro, quadros elétricos e aterramento.",
  Pintor:
    "Foque em pintura de paredes (m²), aplicação de massa corrida, texturas, grafiato e pintura de grades/portas.",
  Pedreiro:
    "Foque em levantamento de alvenaria, reboco, contrapiso, demolição e pequenos reparos estruturais.",
  Azulejista:
    "Foque em assentamento de pisos, cerâmicas, porcelanatos, revestimentos de parede e rejuntamento.",
  Gesseiro:
    "Foque em forros de gesso, sancas, molduras, divisórias de drywall e reparos em gesso liso.",
  Vidraceiro:
    "Foque em instalação de box de banheiro, substituição de vidros quebrados, espelhos e fechamento de sacadas.",
  Serralheiro:
    "Foque em solda de portões, reparo de grades, instalação de corrimão e estruturas metálicas leves.",
  Carpinteiro:
    "Foque em estruturas de telhado, decks de madeira, fôrmas para concreto e reparos em assoalhos.",
  Marteleteiro:
    "Foque em demolição de pisos e lajes, abertura de vãos e remoção de entulho pesado.",
  Impermeabilizador:
    "Foque em aplicação de manta asfáltica, vedação de lajes, piscinas e tratamento de umidade de rodapé.",

  // --- CLIMATIZAÇÃO E ELETRODOMÉSTICOS ---
  "Técnico de Ar Condicionado":
    "Foque em limpeza química, carga de gás R410/R22, instalação de split e manutenção de dreno.",
  "Técnico de Geladeira":
    "Foque em recarga de gás, troca de termostato, borracha de vedação e reparo em compressores.",
  "Técnico de Máquina de Lavar":
    "Foque em troca de placas, mecânica (rolamentos/retentor), bomba de dreno e higienização.",
  "Técnico de Micro-ondas":
    "Foque em troca de magnetron, membrana de teclado, prato e fusíveis de alta tensão.",
  "Técnico de Fogão":
    "Foque em desentupimento de bicos, troca de registro de gás, conversão para GN/GLP e dobradiças de forno.",
  "Técnico de Televisão":
    "Foque em troca de barras de LED, reparo de fonte, conectores HDMI e placas principais.",

  // --- SERVIÇOS DOMÉSTICOS E EXTERNOS ---
  Jardineiro:
    "Foque em roçagem de grama (m²), poda de árvores/cerca viva, adubação e limpeza de folhas.",
  Piscineiro:
    "Foque em aspiração, tratamento químico da água, limpeza de bordas e manutenção de filtros.",
  Faxineira:
    "Foque em limpeza residencial comum, faxina pesada pós-obra e organização de armários.",
  Passadeira:
    "Foque em passar roupas por cesto ou por peça, cuidado com tecidos delicados e engomagem.",
  Cozinheira:
    "Foque em preparo de marmitas semanais, jantares particulares e organização de cardápio.",
  "Limpador de Vidros":
    "Foque em limpeza de vidraças em altura, fachadas comerciais e remoção de manchas de calcário.",
  "Limpador de Estofados":
    "Foque em higienização de sofás, poltronas, colchões e tapetes com extratora.",

  // --- MECÂNICA E AUTOMOTIVO ---
  "Mecânico de Automóveis":
    "Foque em troca de óleo, freios, suspensão, correia dentada e revisão de motor.",
  "Eletricista Automotivo":
    "Foque em bateria, alternador, motor de arranque e instalação de som/alarmes.",
  "Lanterneiro / Funileiro":
    "Foque em reparo de batidas, desamassamento e preparação para pintura automotiva.",
  "Martelinho de Ouro":
    "Foque em remoção de pequenos amassados e mossas sem necessidade de pintura.",
  Borracheiro:
    "Foque em conserto de furos, balanceamento, rodízio de pneus e vulcanização.",
  "Lavador de Carros (Detailer)":
    "Foque em lavagem detalhada, polimento técnico, vitrificação e limpeza de motor.",

  // --- MONTAGEM E LOGÍSTICA ---
  "Montador de Móveis":
    "Foque em móveis de magazine (caixa), regulagem de portas, desmontagem para mudança e fixação de painéis.",
  "Marceiro (Móveis Planejados)":
    "Foque em ajustes de móveis sob medida, troca de corrediças telescópicas e reparo em MDF/MDP.",
  "Carreteiro / Freteiro":
    "Foque em transporte de pequenas cargas, carretos locais e auxílio em carga/descarga.",
  "Mudanças Residencial":
    "Foque em embalagem de itens frágeis, desmontagem e transporte completo de residências.",

  // --- BELEZA E BEM-ESTAR ---
  Cabeleireiro:
    "Foque em corte masculino/feminino, coloração, escova progressiva e tratamentos capilares.",
  "Manicure / Pedicure":
    "Foque em cutilagem, esmaltação comum/gel, alongamento em fibra de vidro e spa dos pés.",
  Maquiadora:
    "Foque em maquiagem para eventos, noivas, social e automaquiagem.",
  Depiladora:
    "Foque em depilação com cera quente/fria, linha egípcia e designer de sobrancelhas.",
  "Esteticista Facial":
    "Foque em limpeza de pele profunda, peelings, microagulhamento e drenagem facial.",
  Massoterapeuta:
    "Foque em massagem relaxante, drenagem linfática, massagem modeladora e ventosaterapia.",
  Barbeiro:
    "Foque em corte degradê, barba com toalha quente, selagem e pigmentação de barba.",

  // --- SAÚDE E CUIDADOS (TAXA DE VINCULAÇÃO) ---
  Fisioterapeuta:
    "Foque em sessões de reabilitação motora, RPG, pilates clínico e atendimento domiciliar.",
  Nutricionista:
    "Foque em elaboração de plano alimentar, avaliação antropométrica e reeducação alimentar.",
  Psicólogo:
    "Foque em sessões de psicoterapia individual, casal ou infantil (presencial ou online).",
  "Personal Trainer":
    "Foque em consultoria de treino, acompanhamento presencial em academia ou domicílio.",
  "Cuidador de Idosos":
    "Foque em auxílio na higiene, administração de medicamentos e companhia.",
  Babá: "Foque em cuidados infantis, auxílio em tarefas escolares e atividades lúdicas.",
  "Enfermeiro Domiciliar":
    "Foque em curativos complexos, aplicação de injetáveis e monitoramento de sinais vitais.",

  // --- TECNOLOGIA E ESCRITÓRIO ---
  "Técnico de Informática":
    "Foque em formatação, remoção de vírus, instalação de redes Wi-Fi e upgrade de hardware (SSD/RAM).",
  "Desenvolvedor Web":
    "Foque em criação de sites, correção de bugs em WordPress e lojas virtuais.",
  "Designer Gráfico":
    "Foque em criação de logotipos, artes para redes sociais e materiais impressos.",
  "Gestor de Tráfego":
    "Foque em configuração de anúncios no Google Ads e Meta Ads (Facebook/Instagram).",
  Fotógrafo:
    "Foque em ensaios externos, cobertura de eventos, fotografia de produtos e edição de fotos.",
  "Editor de Vídeo":
    "Foque em cortes, legendas, coloração e edição de vídeos para YouTube/Reels.",

  // --- EDUCAÇÃO E IDIOMAS ---
  "Professor de Inglês":
    "Foque em aulas particulares, conversação, preparação para exames (IELTS/TOEFL).",
  "Professor de Matemática":
    "Foque em reforço escolar, preparação para ENEM e concursos públicos.",
  "Professor de Música":
    "Foque em aulas de violão, piano, técnica vocal ou teclado.",

  // --- ANIMAIS (PETS) ---
  "Adestrador de Cães":
    "Foque em obediência básica, correção de comportamento e socialização.",
  "Passeador de Cães (Dog Walker)":
    "Foque em passeios recreativos e gastos de energia para cães.",
  "Groomer / Tosador":
    "Foque em banho e tosa higiênica, tosa da raça e hidratação pet.",

  // --- EVENTOS E DIVERSOS ---
  Churrasqueiro:
    "Foque em preparo de carnes para eventos, guarnições e controle do fogo.",
  "Garçom / Garçonete":
    "Foque em serviço de mesa, atendimento em eventos e organização de buffet.",
  "Segurança Particular":
    "Foque em vigilância de eventos, controle de acesso e proteção VIP.",
  Dedetizador:
    "Foque em controle de baratas, formigas, cupins e ratos com produtos certificados.",
  Chaveiro:
    "Foque em abertura de portas (residencial/auto), troca de segredo e cópias de chaves.",
  "Desentupidor Profissional":
    "Foque em desentupimento industrial com máquina rotativa ou hidrojateamento.",
  "Instalador de Redes de Proteção":
    "Foque em redes para janelas, sacadas e piscinas (norma ABNT).",
  "Instalador de Papel de Parede":
    "Foque em aplicação de papel vinílico, adesivos e painéis fotográficos.",
  "Técnico de Alarmes e CFTV":
    "Foque em instalação de câmeras, sensores de movimento e cercas elétricas.",
};
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 5000;

async function gerarTarefasComIA(
  profissao: string,
  contexto: string,
): Promise<TaskItem[]> {
  const prompt = `
        Aja como um especialista em orçamentos para a profissão: ${profissao}.
        Contexto real: ${contexto}
        
        Gere uma lista de 40 tarefas que este profissional realiza no mundo real.
        IMPORTANTE: 
        - Agrupe serviços parecidos (ex: instalar ou trocar tomada é o mesmo preço).
        - Use preços de mão de obra realistas.
        - Retorne APENAS um JSON: {"tarefas": [{"nome": "...", "preco": 00.00, "unid": "unidade|m2|fixo", "keys": "..."}]}
    `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed?.tarefas) ? parsed.tarefas : [];
    return list as TaskItem[];
  } catch (e) {
    console.error(`❌ Erro em ${profissao}:`, (e as any)?.message || String(e));
    return [];
  }
}

const SPECIALISTS_KEYS = Array.from(
  new Set<string>([
    ...Object.keys((ESPECIALISTAS as SpecialistsMap) || {}),
    ...Object.keys((ESPECIALISTAS_EXPANDIDO as SpecialistsMap) || {}),
    ...Object.keys((ESPECIALISTAS_MAIS_100 as SpecialistsMap) || {}),
  ]),
);

const getContext = (profissao: string): string => {
  const a = (ESPECIALISTAS as SpecialistsMap)[profissao];
  if (a) return a;
  const b = (ESPECIALISTAS_EXPANDIDO as SpecialistsMap)[profissao];
  if (b) return b;
  const c = (ESPECIALISTAS_MAIS_100 as SpecialistsMap)[profissao];
  if (c) return c;
  return "";
};

async function processarEmLotes() {
  const profissoesKeys = SPECIALISTS_KEYS;
  let sqlFinal = `-- SQL GERADO PARA 200+ PROFISSÕES (uso incremental)\n-- Inserts abaixo são não-destrutivos (INSERT IGNORE)\n\n`;

  console.log(
    `🚀 Iniciando processamento de ${profissoesKeys.length} profissões...`,
  );

  for (let i = 0; i < profissoesKeys.length; i += BATCH_SIZE) {
    const lote = profissoesKeys.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const promessas = lote.map((p) => gerarTarefasComIA(p, getContext(p)));
    const resultadosLote = await Promise.all(promessas);

    lote.forEach((profissao, index) => {
      const tarefas = resultadosLote[index];
      tarefas.forEach((t) => {
        const pricingType =
          t.unid === "m2"
            ? "per_unit"
            : t.unid === "unidade"
              ? "per_unit"
              : "fixed";
        const unitName = t.unid === "fixo" ? "NULL" : `'${t.unid}'`;

        sqlFinal += `INSERT IGNORE INTO task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords)
SELECT id, '${t.nome.replace(/'/g, "''")}', '${pricingType}', ${unitName}, ${t.preco}, '${t.keys}'
FROM professions WHERE name LIKE '%${profissao}%' LIMIT 1;\n`;
      });
    });

    // Grava progresso parcial para não perder dados se cair a net
    fs.appendFileSync("catalogo_final.sql", sqlFinal);
    sqlFinal = ""; // Limpa para o próximo lote

    console.log(
      `⏳ Aguardando ${BATCH_DELAY_MS / 1000}s para o próximo lote...`,
    );
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(
    "\n✅ PROCESSO CONCLUÍDO! O ficheiro 'catalogo_final.sql' está pronto.",
  );
}

export { gerarTarefasComIA, processarEmLotes };
if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  processarEmLotes();
}
