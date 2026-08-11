-- ============================================================================
-- RPCs for BYOK Encrypt and Decrypt using pgcrypto
-- Run this in your Supabase SQL editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_agent_byok_key(
  p_account_id UUID,
  p_agent_id UUID,
  p_api_key TEXT,
  p_provider TEXT,
  p_secret TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO public.account_agent_settings (account_id, agent_id, byok_key_encrypted, byok_provider, byok_connected_at)
  VALUES (
    p_account_id,
    p_agent_id,
    pgp_sym_encrypt(p_api_key, p_secret),
    p_provider,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (account_id, agent_id) DO UPDATE SET
    byok_key_encrypted = pgp_sym_encrypt(p_api_key, p_secret),
    byok_provider = EXCLUDED.byok_provider,
    byok_connected_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_agent_byok_key(
  p_account_id UUID,
  p_agent_id UUID,
  p_secret TEXT
) RETURNS TEXT AS $$
DECLARE
  v_decrypted TEXT;
BEGIN
  SELECT pgp_sym_decrypt(byok_key_encrypted::bytea, p_secret)
  INTO v_decrypted
  FROM public.account_agent_settings
  WHERE account_id = p_account_id AND agent_id = p_agent_id;
  
  RETURN v_decrypted;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
