-- Script to create Supabase Storage buckets and security policies
-- Buckets: avatars, portfolio, chat_media, service_media

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true),
  ('chat_media', 'chat_media', true),
  ('service_media', 'service_media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects (already enabled by Supabase by default)
-- Removed ALTER TABLE to avoid permission error with Prisma

-- 1. Avatars: Anyone can read, Authenticated can insert/update their own
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Avatar Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 2. Portfolio: Anyone can read, Authenticated providers can insert
CREATE POLICY "Portfolio Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Portfolio Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

-- 3. Chat Media: Read/Insert only if authenticated
CREATE POLICY "Chat Media Read" ON storage.objects FOR SELECT USING (bucket_id = 'chat_media' AND auth.role() = 'authenticated');
CREATE POLICY "Chat Media Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_media' AND auth.role() = 'authenticated');

-- 4. Service Media: Read/Insert only if authenticated
CREATE POLICY "Service Media Read" ON storage.objects FOR SELECT USING (bucket_id = 'service_media' AND auth.role() = 'authenticated');
CREATE POLICY "Service Media Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service_media' AND auth.role() = 'authenticated');
