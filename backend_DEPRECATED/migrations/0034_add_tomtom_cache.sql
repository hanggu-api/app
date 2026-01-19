CREATE TABLE IF NOT EXISTS cached_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_query TEXT UNIQUE, -- Ex: "mix mateus bacuri imperatriz"
    full_address TEXT,        -- Ex: "R. Benedito Leite, 123, Imperatriz - MA"
    name TEXT,                -- Nome curto (POI) pra UI
    lat REAL,
    lng REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
