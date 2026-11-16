-- LGPD: o consentimento (ex: uso de imagem) pode ser revogado a qualquer momento
ALTER TABLE consent ADD COLUMN revoked_at timestamptz;
CREATE INDEX consent_account_kind_idx ON consent(account_id, kind, accepted_at DESC);
