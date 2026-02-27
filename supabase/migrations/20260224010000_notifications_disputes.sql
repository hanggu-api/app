-- Fase 2: Tabela de notificações in-app migrada para Supabase
-- Substituindo endpoint /notifications/* do backend legado

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  type TEXT, -- 'service_update', 'payment', 'chat', 'system'
  service_id UUID REFERENCES service_requests_new(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler suas próprias notificações
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- Usuários podem atualizar (marcar como lida) suas próprias notificações
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- Fase 7: Tabela de disputas/contestações migrada para Supabase
CREATE TABLE IF NOT EXISTS service_disputes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id UUID REFERENCES service_requests_new(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT, -- 'photo', 'video', 'audio', 'text'
  evidence_url TEXT,
  reason TEXT,
  status TEXT DEFAULT 'open',  -- 'open', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own disputes"
  ON service_disputes FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

CREATE POLICY "Users can read their own disputes"
  ON service_disputes FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );
