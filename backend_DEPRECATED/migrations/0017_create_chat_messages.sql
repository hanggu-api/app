-- Migration: Create chat_messages table
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    sent_at TEXT DEFAULT (datetime('now')),
    read_at TEXT,
    FOREIGN KEY(service_id) REFERENCES service_requests(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_messages_service_id ON chat_messages(service_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
