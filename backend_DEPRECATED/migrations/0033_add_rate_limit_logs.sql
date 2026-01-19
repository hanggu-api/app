-- Rate Limiting Support for Cloudflare D1
-- Created at: 2026-02-21

CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    route TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Otimizar as consultas de rate limit (Busca rápida por IP na Rota X nos últimos minutos)
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_route_time ON rate_limit_logs(ip_address, route, created_at);
