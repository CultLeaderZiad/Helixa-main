-- Add profile fields to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Auth Upload Access" ON storage.objects;
CREATE POLICY "Auth Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update and delete their own avatars
DROP POLICY IF EXISTS "Auth Update Access" ON storage.objects;
CREATE POLICY "Auth Update Access" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Auth Delete Access" ON storage.objects;
CREATE POLICY "Auth Delete Access" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);
