-- Create Notification Templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id TEXT PRIMARY KEY, -- e.g., 'welcome_provider', 'service_finished'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- 'system', 'promotional', 'transactional'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Notification Logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, -- Can be client or provider
    user_type TEXT NOT NULL, -- 'client' or 'provider'
    template_id TEXT, -- Optional, if sent from template
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON string for extra data (action URL, etc.)
    is_read BOOLEAN DEFAULT 0,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- Add default templates
INSERT OR IGNORE INTO notification_templates (id, title, body, type) VALUES 
('welcome_provider', 'Bem-vindo ao App!', 'Olá {{name}}, estamos felizes em ter você como parceiro.', 'system'),
('service_request', 'Novo Pedido de Serviço', 'Você recebeu um novo pedido de serviço de {{client_name}}.', 'transactional'),
('service_accepted', 'Serviço Aceito', 'O prestador {{provider_name}} aceitou seu pedido.', 'transactional'),
('payment_received', 'Pagamento Recebido', 'Você recebeu R$ {{amount}} pelo serviço.', 'transactional');
