
// Mock Database for Demo

export const USERS = [
    { id: 1, name: "Investidor Demo", email: "demo@investidor.com", role: "client" },
    { id: 2, name: "Cliente Teste", email: "cliente@teste.com", role: "client" },
    { id: 3, name: "Admin Demo", email: "admin@demo.com", role: "admin" }
];

export const PROVIDERS = [
    {
        id: 101,
        user_id: 101,
        name: "Barbearia Vintage",
        email: "barba@demo.com",
        bio: "Especialista em cortes clássicos e barba na toalha quente.",
        address: "Rua Augusta, 100",
        rating_avg: 4.9,
        rating_count: 120,
        latitude: -23.5505,
        longitude: -46.6333,
        is_online: true,
        professions: ["Barbeiro", "Cabelereiro"]
    },
    {
        id: 102,
        user_id: 102,
        name: "João Pedreiro",
        email: "obra@demo.com",
        bio: "Construção e reformas em geral. 20 anos de experiência.",
        address: "Av. Paulista, 500",
        rating_avg: 4.8,
        rating_count: 45,
        latitude: -23.5615,
        longitude: -46.6559,
        is_online: true,
        professions: ["Pedreiro", "Pintor"]
    },
    {
        id: 103,
        user_id: 103,
        name: "Gela Rápido",
        email: "frio@demo.com",
        bio: "Instalação e manutenção de Ar Condicionado Split e Janela.",
        address: "Rua Vergueiro, 200",
        rating_avg: 5.0,
        rating_count: 210,
        latitude: -23.5700,
        longitude: -46.6400,
        is_online: true,
        professions: ["Técnico de Refrigeração", "Eletricista"]
    },
    {
        id: 104,
        user_id: 104,
        name: "Maria Manicure",
        email: "unha@demo.com",
        bio: "Unhas decoradas e alongamento em gel.",
        address: "Rua dos Pinheiros, 300",
        rating_avg: 4.7,
        rating_count: 89,
        latitude: -23.5650,
        longitude: -46.6800,
        is_online: true,
        professions: ["Manicure", "Pedicure"]
    },
    {
        id: 105,
        user_id: 105,
        name: "EletroSoluções",
        email: "luz@demo.com",
        bio: "Reparos elétricos residenciais e prediais 24h.",
        address: "Av. Faria Lima, 1000",
        rating_avg: 4.6,
        rating_count: 55,
        latitude: -23.5800,
        longitude: -46.6900,
        is_online: false,
        professions: ["Eletricista"]
    },
    // --- NEW PROVIDERS ---
    {
        id: 106,
        user_id: 106,
        name: "A Toca do Barbeiro",
        email: "toca@demo.com",
        bio: "Estilo rústico e cerveja gelada enquanto você corta.",
        address: "Rua da Consolação, 500",
        rating_avg: 4.8,
        rating_count: 85,
        latitude: -23.5550,
        longitude: -46.6400,
        is_online: true,
        professions: ["Barbeiro", "Cabelereiro"]
    },
    {
        id: 107,
        user_id: 107,
        name: "Clima Bom",
        email: "clima@demo.com",
        bio: "Higienização e carga de gás. Preço justo.",
        address: "Rua Domingos de Morais, 800",
        rating_avg: 4.5,
        rating_count: 32,
        latitude: -23.5750,
        longitude: -46.6350,
        is_online: true,
        professions: ["Técnico de Refrigeração"]
    },
    {
        id: 108,
        user_id: 108,
        name: "Elétrica 24h",
        email: "eletrica24@demo.com",
        bio: "Emergências elétricas a qualquer hora. Aceitamos cartão.",
        address: "Av. Rebouças, 1200",
        rating_avg: 4.9,
        rating_count: 150,
        latitude: -23.5680,
        longitude: -46.6700,
        is_online: true,
        professions: ["Eletricista"]
    },
    {
        id: 109,
        user_id: 109,
        name: "Estúdio Bela Unha",
        email: "bela@demo.com",
        bio: "Especialista em nail art e spa dos pés.",
        address: "Rua Pamplona, 400",
        rating_avg: 4.8,
        rating_count: 60,
        latitude: -23.5620,
        longitude: -46.6520,
        is_online: true,
        professions: ["Manicure", "Pedicure"]
    },
    {
        id: 110,
        user_id: 110,
        name: "Pereira Reformas",
        email: "pereira@demo.com",
        bio: "Pintura, acabamento e reparos gerais. Orçamento sem compromisso.",
        address: "Rua Teodoro Sampaio, 800",
        rating_avg: 4.7,
        rating_count: 40,
        latitude: -23.5580,
        longitude: -46.6750,
        is_online: true,
        professions: ["Pedreiro", "Pintor"]
    }
];

export const SERVICES = [
    {
        id: 1,
        name: "Corte de Cabelo",
        keywords: ["barba", "cabelo", "bigode", "corte", "tesoura", "barbeiro", "homem", "masculino", "degrade", "social", "pigmentacao", "pezinho"],
        profession_name: "Barbeiro",
        task_name: "Corte Masculino",
        price: 50.00,
        pricing_type: "fixed_price",
        service_type: "at_provider" // User goes to provider (Fixed Location)
    },
    {
        id: 2,
        name: "Instalação Ar Condicionado",
        keywords: ["ar", "condicionado", "frio", "quente", "instalar", "climatização", "split", "janela", "inverter", "limpeza ar", "gás", "manutenção", "refrigeração"],
        profession_name: "Técnico de Refrigeração",
        task_name: "Instalação 9000 BTUs",
        price: 350.00,
        pricing_type: "fixed_price",
        service_type: "on_site" // Provider goes to user (Mobile)
    },
    {
        id: 3,
        name: "Reparo Elétrico",
        keywords: ["luz", "tomada", "disjuntor", "fio", "curto", "energia", "eletricista", "lampada", "chuveiro", "resistencia", "220v", "110v", "quadro", "fiação"],
        profession_name: "Eletricista",
        task_name: "Troca de Disjuntor",
        price: 120.00,
        pricing_type: "fixed_price",
        service_type: "on_site"
    },
    {
        id: 4,
        name: "Pintura Parede",
        keywords: ["pintar", "parede", "tinta", "massa", "rolos", "pintor", "acabamento", "latex", "acrilica", "suvinil", "coral", "textura", "grafiato"],
        profession_name: "Pintor",
        task_name: "Pintura por m²",
        price: 25.00,
        pricing_type: "hourly", // Example of hourly/unit based
        service_type: "on_site"
    },
    {
        id: 5,
        name: "Manicure Completa",
        keywords: ["unha", "mao", "pe", "esmalte", "cuticula", "manicure", "pedicure", "gel", "fibra", "decorada", "francesinha", "alongamento"],
        profession_name: "Manicure",
        task_name: "Mão e Pé",
        price: 60.00,
        pricing_type: "fixed_price",
        service_type: "at_provider" // Can be both, but let's demo 'at_provider' or 'on_site' if we want delivery. Usually manicure is mobile in these apps? Let's stick to at_provider for variance.
    },
    {
        id: 6,
        name: "Pequenos Reparos",
        keywords: ["marido", "aluguel", "conserto", "furadeira", "quadro", "cortina", "trilho", "dobradiça", "porta", "maçaneta", "prateleira", "faz tudo"],
        profession_name: "Pedreiro",
        task_name: "Instalação de Prateleira",
        price: 80.00,
        pricing_type: "hourly",
        service_type: "on_site"
    },
    {
        id: 7,
        name: "Limpeza Pós Obra",
        keywords: ["limpeza", "faxina", "obra", "pó", "sujeira", "entulho", "chão", "piso", "vidro", "janela", "faxineira"],
        profession_name: "Pedreiro",
        task_name: "Limpeza Pesada",
        price: 200.00,
        pricing_type: "fixed_price",
        service_type: "on_site"
    }
];

export const NOTIFICATIONS = [
    { title: "Bem-vindo!", body: "Explore os melhores prestadores da região.", type: "welcome" }
];
