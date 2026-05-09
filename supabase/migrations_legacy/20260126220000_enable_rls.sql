
-- Enable RLS on all public tables
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_professions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Create Policies (Basic read access for Authenticated/Anon to suppress warnings)
-- In a real production app, you'd want tighter controls, but this matches "Public Read" often used for starters.
-- Service Role bypasses RLS automatically.

CREATE POLICY "Public Read Categories" ON "categories" FOR SELECT USING (true);
CREATE POLICY "Public Read Professions" ON "professions" FOR SELECT USING (true);
CREATE POLICY "Public Read Providers" ON "providers" FOR SELECT USING (true);

-- For sensitive tables, we might want to restrict to owner, but for now let's just leave RLS enabled (implicit deny for Anon/Auth unless policy exists).
-- Service Role (backend) will still work.
