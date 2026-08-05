-- 1. Fix: Function Search Path Mutable
-- We must redefine the trigger function with "SET search_path = public"
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (id, email, role, plan)
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    'trial'
  );
  RETURN NEW;
END;
$$;


-- 2. Fix: Public Bucket Allows Listing
-- Drop the broad SELECT policy on the avatars bucket to prevent listing all files.
-- Public URL access will still work because the bucket is public!
DROP POLICY IF EXISTS "Public Access" ON storage.objects;


-- 3 & 4. Fix: Public/Signed-In Users Can Execute SECURITY DEFINER Function
-- Revoke execution rights from external API users for trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
