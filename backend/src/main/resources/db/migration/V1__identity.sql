-- Extensões usadas pelos próximos módulos (busca por distância, busca por texto, constraint de horário)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE account (
    id          uuid PRIMARY KEY,
    phone       varchar(20) NOT NULL UNIQUE,      -- E.164 (+5511987654321)
    email       varchar(254),
    created_at  timestamptz NOT NULL,
    deleted_at  timestamptz
);

CREATE TABLE account_role (
    account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    role        varchar(20) NOT NULL CHECK (role IN ('CLIENT', 'PROFESSIONAL')),
    PRIMARY KEY (account_id, role)
);

-- LGPD: registro de cada aceite com a versão do texto
CREATE TABLE consent (
    id           uuid PRIMARY KEY,
    account_id   uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    kind         varchar(40) NOT NULL,
    version      varchar(40) NOT NULL,
    accepted_at  timestamptz NOT NULL
);
CREATE INDEX consent_account_idx ON consent(account_id);

CREATE TABLE otp_challenge (
    id           uuid PRIMARY KEY,
    phone        varchar(20) NOT NULL,
    code_hash    varchar(64) NOT NULL,                -- sha256(pepper:phone:code), nunca o código em claro
    expires_at   timestamptz NOT NULL,
    attempts     int NOT NULL DEFAULT 0,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL
);
CREATE INDEX otp_phone_created_idx ON otp_challenge(phone, created_at DESC);

CREATE TABLE refresh_token (
    id          uuid PRIMARY KEY,
    account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL UNIQUE,
    family_id   uuid NOT NULL,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL
);
CREATE INDEX refresh_family_idx ON refresh_token(family_id);
