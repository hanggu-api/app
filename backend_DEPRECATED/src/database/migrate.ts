import fs from "fs";
import path from "path";
import pool from "./db";

const migrate = async () => {
  try {
    const args = process.argv.slice(2);
    const catalogOnly = args.includes("--catalog-only");
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log("🔗 Connecting to database...");
    const connection = await pool.getConnection();

    console.log("🚫 Non-destructive migration: preserving existing data");

    if (!catalogOnly) {
      console.log("⚙️ Running migrations...");
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (err) {
          console.error(
            "Error executing statement:",
            statement.substring(0, 50) + "...",
            err,
          );
          throw err;
        }
      }
    } else {
      console.log("ℹ️ Skipping base schema (catalog-only mode)");
    }

    const dbName = String(process.env.DB_NAME || "").trim();
    const ensureColumn = async (
      table: string,
      column: string,
      columnType: string,
    ) => {
      const [rows]: any = await connection.query(
        "SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [dbName, table, column],
      );
      const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
      if (c === 0) {
        await connection.query(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${columnType}`,
        );
      }
    };

    const ensureIndex = async (
      table: string,
      index: string,
      definition: string,
    ) => {
      const [rows]: any = await connection.query(
        "SELECT COUNT(1) as c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [dbName, table, index],
      );
      const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
      if (c === 0) {
        await connection.query(
          `CREATE INDEX ${index} ON ${table} ${definition}`,
        );
      }
    };

    const ensureUniqueIndex = async (
      table: string,
      index: string,
      definition: string,
    ) => {
      const [rows]: any = await connection.query(
        "SELECT COUNT(1) as c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [dbName, table, index],
      );
      const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
      if (c === 0) {
        await connection.query(
          `CREATE UNIQUE INDEX ${index} ON ${table} ${definition}`,
        );
      }
    };

    const ensureFulltextIndex = async (
      table: string,
      index: string,
      columns: string,
    ) => {
      const [rows]: any = await connection.query(
        "SELECT COUNT(1) as c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [dbName, table, index],
      );
      const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
      if (c === 0) {
        try {
          await connection.query(
            `CREATE FULLTEXT INDEX ${index} ON ${table} (${columns})`,
          );
        } catch (e) {
          console.warn(
            `⚠️ Could not create FULLTEXT index ${index} on ${table}:`,
            e,
          );
        }
      }
    };

    await ensureColumn("providers", "document_type", "ENUM('cpf','cnpj') NULL");
    await ensureColumn("providers", "document_value", "VARCHAR(20)");
    await ensureColumn("providers", "commercial_name", "VARCHAR(100)");
    await ensureIndex(
      "providers",
      "idx_providers_document",
      "(document_value)",
    );

    // Ensure avatar blob/mime columns exist on users
    await ensureColumn("users", "avatar_blob", "LONGBLOB");
    await ensureColumn("users", "avatar_mime", "VARCHAR(64)");

    // Ensure profession column on service_requests
    await ensureColumn(
      "service_requests",
      "profession",
      "VARCHAR(128) DEFAULT NULL",
    );

    // Deduplicate professions by name and enforce unique index
    try {
      const [dupRows]: any = await connection.query(
        "SELECT name, GROUP_CONCAT(id) AS ids, MIN(id) AS keep_id, COUNT(*) AS c FROM professions GROUP BY name HAVING c > 1",
      );
      const dups: any[] = Array.isArray(dupRows) ? dupRows : [];
      for (const d of dups) {
        const keepId = Number(d.keep_id);
        const idsStr = String(d.ids || "");
        const allIds = idsStr
          .split(",")
          .map((s: string) => Number(s))
          .filter((n: number) => Number.isFinite(n));
        const toDelete = allIds.filter((n: number) => n !== keepId);
        for (const delId of toDelete) {
          await connection.query(
            "UPDATE provider_professions SET profession_id = ? WHERE profession_id = ?",
            [keepId, delId],
          );
          await connection.query("DELETE FROM professions WHERE id = ?", [
            delId,
          ]);
        }
      }
      await ensureUniqueIndex("professions", "uniq_professions_name", "(name)");
    } catch (e) {
      console.warn("⚠️ Could not deduplicate professions:", e);
    }

    // Intelligence columns for professions
    try {
      await ensureColumn("professions", "keywords", "TEXT");
      await ensureColumn("professions", "search_vector", "JSON");
      await ensureColumn("professions", "popularity_score", "INT DEFAULT 0");
      await ensureFulltextIndex(
        "professions",
        "ft_professions_name_keywords",
        "name, keywords",
      );
    } catch (e) {
      console.warn("⚠️ Could not add intelligence columns to professions:", e);
    }

    try {
      const actions = [
        "Instalador de",
        "Manutenção de",
        "Técnico de Manutenção de",
        "Reparo de",
        "Montagem de",
        "Reforma de",
        "Impermeabilização de",
        "Dedetização de",
      ];
      const extraActions = [
        "Cuidador de",
        "Professor de",
        "Consultoria para",
        "Advogado de",
        "Treinador de",
        "Especialista em",
        "Passeador de",
        "Nutricionista com foco em",
        "Fisioterapeuta para",
        "Contador de",
      ];
      const objects = [
        "Geladeira",
        "Freezer",
        "Máquina de Lavar",
        "Lava e Seca",
        "Lava-louças",
        "Secadora",
        "Micro-ondas",
        "Fogão",
        "Cooktop",
        "Forno Elétrico",
        "Aquecedor a Gás",
        "Chuveiro Elétrico",
        "Boiler",
        "Ar Condicionado",
        "Split",
        "Painel Solar",
        "Inversor Solar",
        "Bomba d'água",
        "Caixa d'água",
        "Filtro de Água",
        "Purificador",
        "Torneira",
        "Válvula de Descarga",
        "Registro",
        "Cano",
        "Ralo",
        "Pia",
        "Vaso Sanitário",
        "Box de Banheiro",
        "Piso Vinílico",
        "Piso Laminado",
        "Porcelanato",
        "Azulejo",
        "Drywall",
        "Gesso",
        "Sanca",
        "Porta",
        "Janela",
        "Dobradiça",
        "Fechadura",
        "Trilho",
        "Persiana",
        "Cortina",
        "Papel de Parede",
        "Rodapé",
        "Rodaforro",
        "Moldura",
        "Telhado",
        "Telha",
        "Calha",
        "Rufos",
        "Impermeabilização",
        "Vedação",
        "Portão Automático",
        "Motor de Portão",
        "Cerca Elétrica",
        "Interfone",
        "Videoporteiro",
        "Câmera de Segurança",
        "CFTV",
        "Alarme",
        "Rede de Proteção",
        "Suporte de TV",
        "Antena",
        "Roteador",
        "Switch",
        "Access Point",
        "Cabeamento Estruturado",
        "Tomada",
        "Interruptor",
        "Disjuntor",
        "Quadro de Luz",
        "Aterramento",
        "Para-raios",
        "Automação Residencial",
        "Som Ambiente",
        "Home Theater",
        "Piscina",
        "Filtro de Piscina",
        "Casa de Máquinas",
        "Jardim",
        "Irrigação",
        "Poda",
        "Grama",
        "Paisagismo",
        "Estofados",
        "Sofá",
        "Colchão",
        "Tapetes",
        "Fachada",
        "Vidro",
        "Espelho",
        "Box",
        "Computador",
        "Notebook",
        "Impressora",
        "Smartphone",
        "Tablet",
        "TV",
        "Projetor",
        "Nobreak",
        "Estabilizador",
        "Catraca",
        "Controle de Acesso",
        "Rede",
        "Servidor",
        "Cabo Coaxial",
        "Fibra Óptica",
        "DVR",
        "NVR",
        "Corrimão",
        "Guarda-corpo",
        "Estrutura Metálica",
        "Solda",
        "Porta de Madeira",
        "Armário",
        "Móveis Planejados",
        "Prateleira",
        "Closet",
        "Porta Sanfonada",
        "Porta de Correr",
        "Janela Basculante",
        "Janela de Correr",
        "Vidraceiro Automotivo",
        "Película",
        "Insulfilm",
        "Capota Marítima",
        "Som Automotivo",
        "Alarme Automotivo",
        "Rastreador",
        "Farol",
        "Lanterna",
        "Bateria",
        "Alternador",
        "Arranque",
        "Ignição",
        "Radiador",
        "Escapamento",
        "Freio",
        "Embreagem",
        "Suspensão",
        "Pneu de Carro",
        "Pneu de Moto",
        "Pneu de Bicicleta",
        "Roda de Carro",
        "Roda de Moto",
        "Roda de Bicicleta",
        "Câmara de Ar",
        "Calota",
      ];
      const extraObjects = [
        "Idosos",
        "Crianças (Babá)",
        "Pessoas com Deficiência",
        "Cães (Dog Walker)",
        "Gatos (Cat Sitter)",
        "Pets Exóticos",
        "Adestramento",
        "Pós-Operatório",
        "Fisioterapia Motora",
        "Fisioterapia Respiratória",
        "RPG",
        "Pilates",
        "Nutrição Esportiva",
        "Nutrição Clínica",
        "Nutrição Vegana",
        "Personal Trainer",
        "Yoga",
        "Meditação",
        "Psicologia Infantil",
        "Terapia de Casal",
        "Inglês",
        "Espanhol",
        "Matemática",
        "Reforço Escolar",
        "Piano",
        "Violão",
        "Canto",
        "Programação",
        "Informática para Idosos",
        "Culinária",
        "Causa Trabalhista",
        "Direito da Família",
        "Divórcio",
        "Inventário",
        "Causa Imobiliária",
        "Direito Digital",
        "Direito Tributário",
        "Causa Criminal",
        "Direito do Consumidor",
        "Previdenciário (INSS)",
        "Contratos",
        "Gestão Financeira",
        "Marketing Digital",
        "RH e Recrutamento",
        "Vendas",
        "Segurança do Trabalho",
        "Licenciamento Ambiental",
        "Imposto de Renda",
        "Abertura de Empresa (MEI/LTDA)",
        "Auditoria",
        "Perícia Contábil",
      ];
      const healthSet = new Set<string>([
        "Idosos",
        "Crianças (Babá)",
        "Pessoas com Deficiência",
        "Pós-Operatório",
        "Fisioterapia Motora",
        "Fisioterapia Respiratória",
        "RPG",
        "Pilates",
        "Nutrição Esportiva",
        "Nutrição Clínica",
        "Nutrição Vegana",
        "Personal Trainer",
        "Yoga",
        "Meditação",
        "Psicologia Infantil",
        "Terapia de Casal",
      ]);
      const petSet = new Set<string>([
        "Cães (Dog Walker)",
        "Gatos (Cat Sitter)",
        "Pets Exóticos",
        "Adestramento",
      ]);
      const educationSet = new Set<string>([
        "Inglês",
        "Espanhol",
        "Matemática",
        "Reforço Escolar",
        "Piano",
        "Violão",
        "Canto",
        "Programação",
        "Informática para Idosos",
        "Culinária",
      ]);
      const legalSet = new Set<string>([
        "Causa Trabalhista",
        "Direito da Família",
        "Divórcio",
        "Inventário",
        "Causa Imobiliária",
        "Direito Digital",
        "Direito Tributário",
        "Causa Criminal",
        "Direito do Consumidor",
        "Previdenciário (INSS)",
        "Contratos",
      ]);
      const consultingSet = new Set<string>([
        "Gestão Financeira",
        "Marketing Digital",
        "RH e Recrutamento",
        "Vendas",
        "Segurança do Trabalho",
        "Licenciamento Ambiental",
        "Imposto de Renda",
        "Abertura de Empresa (MEI/LTDA)",
        "Auditoria",
        "Perícia Contábil",
      ]);
      const electronicsSet = new Set<string>([
        "Ar Condicionado",
        "Split",
        "Painel Solar",
        "Inversor Solar",
        "Câmera de Segurança",
        "CFTV",
        "Alarme",
        "Interfone",
        "Videoporteiro",
        "Antena",
        "Roteador",
        "Switch",
        "Access Point",
        "Cabeamento Estruturado",
        "Suporte de TV",
        "TV",
        "Projetor",
        "Nobreak",
        "Estabilizador",
        "Catraca",
        "Controle de Acesso",
        "Rede",
        "Servidor",
        "Cabo Coaxial",
        "Fibra Óptica",
        "DVR",
        "NVR",
        "Motor de Portão",
        "Portão Automático",
        "Cerca Elétrica",
        "Automação Residencial",
        "Som Ambiente",
        "Home Theater",
        "Alarme Automotivo",
        "Rastreador",
        "Som Automotivo",
      ]);
      const chooseAction = (obj: string): string => {
        if (healthSet.has(obj) || petSet.has(obj)) return "Cuidados com";
        if (legalSet.has(obj) || consultingSet.has(obj)) return "Serviços de";
        if (educationSet.has(obj)) return "Professor de";
        const low = obj.toLowerCase();
        if (
          low.includes("móvei") ||
          low.includes("moveis") ||
          low.includes("móveis")
        )
          return "Montagem de";
        return "Manutenção de";
      };
      const pop: Record<string, number> = {
        Geladeira: 95,
        "Máquina de Lavar": 94,
        "Ar Condicionado": 93,
        Tomada: 92,
        Interruptor: 92,
        Disjuntor: 90,
        "Quadro de Luz": 88,
        "Chuveiro Elétrico": 87,
        Fogão: 86,
        Notebook: 85,
        Smartphone: 85,
        TV: 84,
        "Câmera de Segurança": 83,
        CFTV: 82,
        Piscina: 60,
        "Painel Solar": 55,
      };
      const extraPop: Record<string, number> = {
        Idosos: 90,
        "Crianças (Babá)": 88,
        "Cães (Dog Walker)": 85,
        Inglês: 82,
        "Causa Trabalhista": 80,
        "Direito da Família": 81,
        "Imposto de Renda": 95,
        "Personal Trainer": 84,
        "Fisioterapia Motora": 79,
      };
      const buildKeywords = (o: string): string => {
        const n = o.toLowerCase();
        const kws: string[] = [n, "instalação", "manutenção", "reparo"];
        if (n.includes("gelad") || n.includes("freezer"))
          kws.push("frio", "não gela", "compressor", "gás");
        if (n.includes("máquina de lavar") || n.includes("lava e seca"))
          kws.push("lavagem", "rotação", "barulho", "vazamento");
        if (n.includes("micro") || n.includes("forno"))
          kws.push("aquecimento", "resistência", "lâmpada");
        if (n.includes("fogão") || n.includes("cooktop"))
          kws.push("chama", "válvula", "agas", "acendedor");
        if (n.includes("ar condicion") || n.includes("split"))
          kws.push("gás", "vazamento", "limpeza", "troca de filtro");
        if (n.includes("painel solar") || n.includes("inversor"))
          kws.push("energia", "fotovoltaica", "instalação", "string");
        if (
          n.includes("torneira") ||
          n.includes("cano") ||
          n.includes("ralo") ||
          n.includes("pia")
        )
          kws.push("vazamento", "rosca", "vedação", "desentupimento");
        if (n.includes("telha") || n.includes("calha") || n.includes("telhado"))
          kws.push("infiltração", "goteira", "vedação", "reparo");
        if (n.includes("portão"))
          kws.push("motor", "controle", "cremalheira", "fotocélula");
        if (
          n.includes("cerca elétr") ||
          n.includes("interfone") ||
          n.includes("videoporteiro")
        )
          kws.push("segurança", "instalação", "reparo");
        if (n.includes("câmera") || n.includes("cftv") || n.includes("alarme"))
          kws.push("gravação", "cabo", "poe");
        if (
          n.includes("rede") ||
          n.includes("roteador") ||
          n.includes("switch") ||
          n.includes("access point")
        )
          kws.push("wifi", "cabeamento", "manutenção");
        if (
          n.includes("tomada") ||
          n.includes("interruptor") ||
          n.includes("disjuntor") ||
          n.includes("quadro")
        )
          kws.push("elétrica", "curto", "fiação");
        if (n.includes("piscina")) kws.push("limpeza", "cloro", "filtro");
        if (
          n.includes("jardim") ||
          n.includes("poda") ||
          n.includes("grama") ||
          n.includes("paisag")
        )
          kws.push("verde", "manutenção");
        if (
          n.includes("estof") ||
          n.includes("sofá") ||
          n.includes("colchão") ||
          n.includes("tapete")
        )
          kws.push("limpeza", "higienização");
        if (n.includes("vidro") || n.includes("espelho") || n.includes("box"))
          kws.push("instalação", "silicone");
        if (
          n.includes("comput") ||
          n.includes("notebook") ||
          n.includes("impressora") ||
          n.includes("smart") ||
          n.includes("tablet")
        )
          kws.push("formatação", "troca", "tela", "bateria");
        if (
          n.includes("som") ||
          n.includes("home theater") ||
          n.includes("projetor")
        )
          kws.push("instalação", "calibração");
        if (n.includes("solda") || n.includes("estrutura"))
          kws.push("metal", "soldagem");
        if (
          n.includes("armário") ||
          n.includes("móveis") ||
          n.includes("prateleira") ||
          n.includes("porta")
        )
          kws.push("madeira", "marcenaria");
        if (
          n.includes("bateria") ||
          n.includes("alternador") ||
          n.includes("arranque") ||
          n.includes("ignição")
        )
          kws.push("carro", "não liga");
        if (
          n.includes("pneu") ||
          n.includes("roda") ||
          n.includes("câmara de ar") ||
          n.includes("camara de ar") ||
          n.includes("calota")
        )
          kws.push(
            "pneu furado",
            "troca de pneu",
            "calibragem",
            "balanceamento",
            "alinhamento",
            "remendo",
            "vulcanização",
            "estepe",
          );
        if (n.includes("bicicleta") || n.includes("bike"))
          kws.push("câmara", "remendo", "aro");
        if (n.includes("moto")) kws.push("pneu", "aro", "valvula");
        if (n.includes("idos") || n.includes("geriatr"))
          kws.push("home care", "acompanhante", "avô", "avó");
        if (n.includes("babá") || n.includes("crian"))
          kws.push("cuidados", "escola", "brincadeiras");
        if (n.includes("defici"))
          kws.push("acessibilidade", "cuidados especiais");
        if (n.includes("cães") || n.includes("dog"))
          kws.push("cachorro", "passeio", "pet");
        if (n.includes("gatos") || n.includes("cat"))
          kws.push("pet", "visita", "areia");
        if (n.includes("adestr"))
          kws.push("treino", "comandos", "comportamento");
        if (n.includes("pós-oper") || n.includes("pos-oper"))
          kws.push("curativos", "recuperação");
        if (
          n.includes("fisioterapia motora") ||
          n.includes("rpg") ||
          n.includes("pilates")
        )
          kws.push("reabilitação", "exercícios");
        if (n.includes("nutri")) kws.push("dieta", "emagrecer", "saúde");
        if (
          n.includes("personal trainer") ||
          n.includes("yoga") ||
          n.includes("meditação")
        )
          kws.push("treino", "bem-estar");
        if (n.includes("psicologia infantil") || n.includes("terapia de casal"))
          kws.push("psicólogo", "atendimento");
        if (
          n.includes("inglês") ||
          n.includes("espanhol") ||
          n.includes("matemática") ||
          n.includes("reforço escolar")
        )
          kws.push("aulas", "estudo");
        if (n.includes("piano") || n.includes("violão") || n.includes("canto"))
          kws.push("música", "prática");
        if (n.includes("programação") || n.includes("informática"))
          kws.push("curso", "computador");
        if (n.includes("culinária")) kws.push("cozinha", "receitas");
        if (
          n.includes("causa trabalhista") ||
          n.includes("direito da família") ||
          n.includes("divórcio") ||
          n.includes("inventário") ||
          n.includes("imobiliária") ||
          n.includes("digital") ||
          n.includes("tributário") ||
          n.includes("criminal") ||
          n.includes("consumidor") ||
          n.includes("previdenciário") ||
          n.includes("contratos")
        )
          kws.push("advogado", "processo");
        if (
          n.includes("gestão financeira") ||
          n.includes("marketing digital") ||
          n.includes("rh") ||
          n.includes("vendas") ||
          n.includes("segurança do trabalho") ||
          n.includes("licenciamento ambiental") ||
          n.includes("imposto de renda") ||
          n.includes("abertura de empresa") ||
          n.includes("auditoria") ||
          n.includes("perícia contábil")
        )
          kws.push("consultoria", "negócios");
        return Array.from(new Set(kws)).join(", ");
      };
      const allActions = [...actions, ...extraActions];
      const allObjects = [...objects, ...extraObjects];
      const target = 1500;
      const generated: string[] = [];
      for (const o of allObjects) {
        if (generated.length >= target) break;
        if (electronicsSet.has(o)) {
          generated.push(`Instalação de ${o}`);
          generated.push(`Manutenção de ${o}`);
        } else {
          const prefix = chooseAction(o);
          generated.push(`${prefix} ${o}`);
        }
      }
      for (const name of generated) {
        const obj = name.split(" ").slice(-1)[0];
        const baseObj = allObjects.find((x) => name.endsWith(x)) || obj;
        let kws = buildKeywords(baseObj);
        if (electronicsSet.has(baseObj) && !kws.includes("instalação")) {
          kws = `${kws}, instalação`;
        }
        const p = pop[baseObj] ?? extraPop[baseObj] ?? 50;
        await connection.query(
          "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
          [name, kws, p],
        );
      }
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Montagem de Móveis",
          "móveis, montagem, armário, guarda-roupa, prateleira",
          85,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Borracheiro",
          "pneu, borracheiro, troca de pneu, calibragem, remendo, balanceamento, alinhamento, estepe, válvula",
          85,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Borracheiro Automotivo",
          "pneu de carro, borracheiro, troca de pneu, balanceamento, alinhamento, estepe",
          83,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Borracheiro de Moto",
          "pneu de moto, borracheiro, troca de pneu, remendo, calibragem",
          82,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Borracheiro de Bicicleta",
          "pneu de bicicleta, câmara de ar, remendo, borracheiro, calibragem",
          80,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Troca de Pneu de Carro",
          "pneu de carro, troca de pneu, borracheiro, calibragem, balanceamento, estepe",
          84,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Troca de Pneu de Moto",
          "pneu de moto, troca de pneu, borracheiro, remendo, calibragem",
          82,
        ],
      );
      await connection.query(
        "INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (?, ?, ?)",
        [
          "Troca de Pneu de Bicicleta",
          "pneu de bicicleta, câmara de ar, remendo, troca de pneu, calibragem",
          80,
        ],
      );
      // Normalize existing names: replace Configuração/Inspeção/Desinstalação -> Manutenção
      await connection.query(
        "UPDATE professions SET name = REPLACE(name, 'Configuração de ', 'Manutenção de ') WHERE name LIKE 'Configuração de %'",
      );
      await connection.query(
        "UPDATE professions SET name = REPLACE(name, 'Inspeção de ', 'Manutenção de ') WHERE name LIKE 'Inspeção de %'",
      );
      await connection.query(
        "UPDATE professions SET name = REPLACE(name, 'Desinstalação de ', 'Manutenção de ') WHERE name LIKE 'Desinstalação de %'",
      );
      await connection.query(
        "UPDATE professions SET keywords = REPLACE(keywords, 'configuração', 'manutenção') WHERE keywords LIKE '%configuração%'",
      );
      await connection.query(
        "UPDATE professions SET keywords = REPLACE(keywords, 'inspeção', 'manutenção') WHERE keywords LIKE '%inspeção%'",
      );
    } catch (e) {
      console.warn("⚠️ Could not populate long-tail professions:", e);
    }

    // Populate training examples (ai_training_examples) using profession names
    try {
      const getProfId = async (name: string): Promise<number | null> => {
        const [rows]: any = await connection.query(
          "SELECT id FROM professions WHERE name = ? LIMIT 1",
          [name],
        );
        const list: any[] = Array.isArray(rows) ? rows : [];
        return list.length ? Number(list[0].id) : null;
      };
      const insertIfNotExists = async (pid: number, text: string) => {
        const [rows]: any = await connection.query(
          "SELECT COUNT(*) AS c FROM ai_training_examples WHERE profession_id = ? AND text = ?",
          [pid, text],
        );
        const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
        if (c === 0) {
          await connection.query(
            "INSERT INTO ai_training_examples (profession_id, text) VALUES (?, ?)",
            [pid, text],
          );
        }
      };
      const addExamples = async (profName: string, examples: string[]) => {
        const pid = await getProfId(profName);
        if (!pid) return;
        for (const ex of examples) await insertIfNotExists(pid, ex);
      };

      await addExamples("Pedreiro", [
        "Preciso levantar um muro de blocos no fundo do quintal",
        "Construir uma parede de tijolos para dividir a sala",
        "Fazer o alicerce e a fundação de uma pequena edícula",
        "Demolir uma parede interna para ampliar a cozinha",
      ]);
      await addExamples("Construtor", [
        "Quero ampliar minha casa com um cômodo a mais",
        "Preciso de orçamento para reforma da área externa",
      ]);
      await addExamples("Encanador", [
        "Minha pia da cozinha está vazando por baixo no sifão",
        "O vaso sanitário está solto e vazando água pela base",
        "Tem uma mancha de umidade na parede mas não sei onde é o cano",
      ]);
      await addExamples("Bombeiro Hidráulico", [
        "Suspeita de vazamento no encanamento do banheiro",
        "Água pingando no teto perto do chuveiro",
      ]);
      await addExamples("Técnico de Aquecedor", [
        "O aquecedor a gás não liga e sai água gelada no banho",
        "A água demora muito para esquentar no aquecedor",
      ]);
      await addExamples("Eletricista", [
        "O disjuntor geral está estalando e cheirando queimado",
        "Quero trocar todas as tomadas da casa para o padrão novo",
      ]);
      await addExamples("Instalador de Painel Solar", [
        "Orçamento para instalar placas de energia solar no telhado",
        "Quero colocar energia fotovoltaica na minha casa",
      ]);
      await addExamples("Técnico de Ar Condicionado", [
        "Ar condicionado parou de gelar e precisa de carga de gás",
        "Meu split está pingando água na parede",
      ]);
      await addExamples("Técnico de Refrigeração", [
        "Minha geladeira side by side parou de sair gelo na porta",
        "Geladeira não gela direito, só a parte de cima está fria",
      ]);
      await addExamples("Técnico de Máquina de Lavar", [
        "A máquina de lavar faz um barulho muito alto na centrifugação",
        "Máquina de lavar travou com água dentro e não drena",
      ]);
      await addExamples("Técnico de Eletros", [
        "O forno do fogão industrial não mantém a chama acesa",
        "Micro-ondas liga mas não esquenta",
      ]);
      await addExamples("Borracheiro", [
        "Meu pneu do carro furou na rua",
        "Preciso trocar o pneu da minha moto",
        "Calibrar os pneus do carro",
        "Fazer remendo na câmara de ar da bicicleta",
        "Preciso de balanceamento das rodas dianteiras",
        "Trocar o estepe do carro",
        "A válvula do pneu está vazando",
      ]);
      await addExamples("Troca de Pneu de Carro", [
        "Trocar pneu do carro",
        "Pneu furou e preciso trocar pelo estepe",
        "Balanceamento e alinhamento das rodas do carro",
      ]);
      await addExamples("Troca de Pneu de Moto", [
        "Trocar pneu traseiro da moto",
        "Pneu de moto furado precisa de remendo",
      ]);
      await addExamples("Troca de Pneu de Bicicleta", [
        "Remendo na câmara de ar da bicicleta",
        "Trocar pneu da bike 29",
      ]);
    } catch (e) {
      console.warn("⚠️ Could not populate training examples:", e);
    }

    // Domain-based normalization to avoid incoherent combinations
    try {
      const healthSet = new Set<string>([
        "Idosos",
        "Crianças (Babá)",
        "Pessoas com Deficiência",
        "Pós-Operatório",
        "Fisioterapia Motora",
        "Fisioterapia Respiratória",
        "RPG",
        "Pilates",
        "Nutrição Esportiva",
        "Nutrição Clínica",
        "Nutrição Vegana",
        "Personal Trainer",
        "Yoga",
        "Meditação",
        "Psicologia Infantil",
        "Terapia de Casal",
      ]);
      const petSet = new Set<string>([
        "Cães (Dog Walker)",
        "Gatos (Cat Sitter)",
        "Pets Exóticos",
        "Adestramento",
      ]);
      const educationSet = new Set<string>([
        "Inglês",
        "Espanhol",
        "Matemática",
        "Reforço Escolar",
        "Piano",
        "Violão",
        "Canto",
        "Programação",
        "Informática para Idosos",
        "Culinária",
      ]);
      const legalSet = new Set<string>([
        "Causa Trabalhista",
        "Direito da Família",
        "Divórcio",
        "Inventário",
        "Causa Imobiliária",
        "Direito Digital",
        "Direito Tributário",
        "Causa Criminal",
        "Direito do Consumidor",
        "Previdenciário (INSS)",
        "Contratos",
      ]);
      const consultingSet = new Set<string>([
        "Gestão Financeira",
        "Marketing Digital",
        "RH e Recrutamento",
        "Vendas",
        "Segurança do Trabalho",
        "Licenciamento Ambiental",
        "Imposto de Renda",
        "Abertura de Empresa (MEI/LTDA)",
        "Auditoria",
        "Perícia Contábil",
      ]);
      const electronicsSet = new Set<string>([
        "Ar Condicionado",
        "Split",
        "Painel Solar",
        "Inversor Solar",
        "Câmera de Segurança",
        "CFTV",
        "Alarme",
        "Interfone",
        "Videoporteiro",
        "Antena",
        "Roteador",
        "Switch",
        "Access Point",
        "Cabeamento Estruturado",
        "Suporte de TV",
        "TV",
        "Projetor",
        "Nobreak",
        "Estabilizador",
        "Catraca",
        "Controle de Acesso",
        "Rede",
        "Servidor",
        "Cabo Coaxial",
        "Fibra Óptica",
        "DVR",
        "NVR",
        "Motor de Portão",
        "Portão Automático",
        "Cerca Elétrica",
        "Automação Residencial",
        "Som Ambiente",
        "Home Theater",
        "Alarme Automotivo",
        "Rastreador",
        "Som Automotivo",
      ]);
      const normalizePrefix = async (prefix: string, obj: string) => {
        await connection.query(
          'UPDATE professions SET name = CONCAT(?, ?) WHERE name = CONCAT("Manutenção de ", ?)',
          [prefix + " ", obj, obj],
        );
        await connection.query(
          'UPDATE professions SET name = CONCAT(?, ?) WHERE name = CONCAT("Instalação de ", ?)',
          [prefix + " ", obj, obj],
        );
        await connection.query(
          'UPDATE professions SET name = CONCAT(?, ?) WHERE name = CONCAT("Impermeabilização de ", ?)',
          [prefix + " ", obj, obj],
        );
        await connection.query(
          'UPDATE professions SET name = CONCAT(?, ?) WHERE name = CONCAT("Dedetização de ", ?)',
          [prefix + " ", obj, obj],
        );
        await connection.query(
          'UPDATE professions SET name = CONCAT(?, ?) WHERE name = CONCAT("Cuidados com ", ?)',
          [prefix + " ", obj, obj],
        );
      };

      // Ensure legal/consulting are "Serviços de"
      for (const obj of consultingSet) {
        await normalizePrefix("Serviços de", obj);
        await connection.query(
          "UPDATE professions SET keywords = REPLACE(keywords, 'instalação', 'serviços') WHERE name = CONCAT('Serviços de ', ?)",
          [obj],
        );
        await connection.query(
          "UPDATE professions SET keywords = REPLACE(keywords, 'reparo', 'serviços') WHERE name = CONCAT('Serviços de ', ?)",
          [obj],
        );
      }
      for (const obj of legalSet) {
        await normalizePrefix("Serviços de", obj);
        await connection.query(
          "UPDATE professions SET keywords = REPLACE(keywords, 'instalação', 'serviços') WHERE name = CONCAT('Serviços de ', ?)",
          [obj],
        );
        await connection.query(
          "UPDATE professions SET keywords = REPLACE(keywords, 'reparo', 'serviços') WHERE name = CONCAT('Serviços de ', ?)",
          [obj],
        );
      }

      // Ensure health/pet are "Cuidados com"
      for (const obj of healthSet) {
        await normalizePrefix("Cuidados com", obj);
      }
      for (const obj of petSet) {
        await normalizePrefix("Cuidados com", obj);
      }

      // Ensure education are "Professor de"
      for (const obj of educationSet) {
        await normalizePrefix("Professor de", obj);
      }

      // Electronics: only Instalação/Manutenção
      for (const obj of electronicsSet) {
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Dedetização de ", ?)',
          [obj],
        );
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Impermeabilização de ", ?)',
          [obj],
        );
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Serviços de ", ?)',
          [obj],
        );
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Cuidados com ", ?)',
          [obj],
        );
        await connection.query(
          'INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (CONCAT("Instalação de ", ?), ?, 75)',
          [obj, `${obj.toLowerCase()}, instalação`],
        );
        await connection.query(
          'INSERT IGNORE INTO professions (name, keywords, popularity_score) VALUES (CONCAT("Manutenção de ", ?), ?, 80)',
          [obj, `${obj.toLowerCase()}, manutenção`],
        );
      }

      // Remove globally incoherent "Dedetização de <saúde>"
      for (const obj of healthSet) {
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Dedetização de ", ?)',
          [obj],
        );
      }
      for (const obj of consultingSet) {
        await connection.query(
          'UPDATE professions SET name = CONCAT("Serviços de ", ?) WHERE name = CONCAT("Impermeabilização de ", ?)',
          [obj, obj],
        );
        await connection.query(
          'DELETE FROM professions WHERE name = CONCAT("Dedetização de ", ?)',
          [obj],
        );
      }
    } catch (e) {
      console.warn("⚠️ Could not normalize domain prefixes:", e);
    }

    try {
      const [rows]: any = await connection.query(
        "SELECT id, name, keywords, popularity_score, search_vector FROM professions",
      );
      const list: any[] = Array.isArray(rows) ? rows : [];
      const out = list.map((r) => {
        let sv: number[] = [];
        try {
          const raw = r.search_vector;
          if (raw) {
            const arr = Array.isArray(raw) ? raw : JSON.parse(String(raw));
            sv = (arr as any[]).map((n: any) => Number(n || 0));
          }
        } catch (e) {
          // ignore invalid search_vector
        }
        return {
          id: Number(r.id),
          name: String(r.name),
          keywords: String(r.keywords || ""),
          popularity_score: Number(r.popularity_score || 0),
          search_vector: sv,
        };
      });
      const outPath = path.join(__dirname, "..", "ai", "professions.json");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(out));
    } catch (e) {
      console.warn("⚠️ Could not export professions.json:", e);
    }

    try {
      const [cols]: any = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        [dbName, "provider_professions"],
      );
      const names = new Set<string>(
        (Array.isArray(cols) ? cols : []).map((r: any) =>
          String(r.COLUMN_NAME).toLowerCase(),
        ),
      );
      if (!names.has("provider_user_id")) {
        if (names.has("provider_id")) {
          await connection.query(
            "ALTER TABLE provider_professions CHANGE COLUMN provider_id provider_user_id BIGINT NOT NULL",
          );
        } else {
          await connection.query(
            "ALTER TABLE provider_professions ADD COLUMN provider_user_id BIGINT NOT NULL",
          );
        }
      }
      if (!names.has("profession_id")) {
        await connection.query(
          "ALTER TABLE provider_professions ADD COLUMN profession_id INT NOT NULL",
        );
      }
    } catch (e) {
      console.warn("⚠️ Could not ensure provider_professions columns:", e);
    }

    // Optional: apply generated catalog (non-destructive)
    try {
      const catalogPaths = [
        path.join(__dirname, "..", "catalogo_final.sql"),
        path.join(__dirname, "..", "ai", "catalogo_final.sql"),
      ];
      let catalogSql = "";
      for (const p of catalogPaths) {
        if (fs.existsSync(p)) {
          catalogSql = fs.readFileSync(p, "utf8");
          console.log("📦 Applying catalog from", p);
          break;
        }
      }
      if (catalogSql && catalogSql.trim().length > 0) {
        const catStatements = catalogSql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.toLowerCase().includes("truncate"));
        for (const st of catStatements) {
          try {
            await pool.query(st);
          } catch (e) {
            console.warn(
              "⚠️ Catalog statement failed (ignored):",
              st.substring(0, 80) + "...",
              e,
            );
          }
        }
        console.log("✅ Catalog applied (non-destructive).");
      } else {
        console.log("ℹ️ No catalogo_final.sql found to apply.");
      }
    } catch (e) {
      console.warn("⚠️ Could not apply catalog:", e);
    }

    connection.release();
    console.log("✅ Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrate();
