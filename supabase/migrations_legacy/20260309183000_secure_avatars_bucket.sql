UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Update" ON storage.objects;

CREATE POLICY "Avatar Auth Read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Auth Insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar Auth Update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');
