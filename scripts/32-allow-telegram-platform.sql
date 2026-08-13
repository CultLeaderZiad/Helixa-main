ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check CHECK (platform IN ('facebook', 'messenger', 'whatsapp', 'telegram', 'instagram'));
