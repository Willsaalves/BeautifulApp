CREATE TABLE client_profile (
    account_id  uuid PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    name        varchar(80) NOT NULL,
    handle      varchar(32) NOT NULL UNIQUE,
    bio         varchar(160),
    photo_key   varchar(255),
    cover_key   varchar(255),
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL
);

CREATE TABLE professional (
    id                      uuid PRIMARY KEY,
    account_id              uuid NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    name                    varchar(80) NOT NULL,
    studio                  varchar(80) NOT NULL,
    handle                  varchar(32) NOT NULL UNIQUE,
    niche                   varchar(20) NOT NULL,
    bio                     varchar(160),
    photo_key               varchar(255),
    cover_key               varchar(255),
    neighborhood            varchar(80) NOT NULL,
    city                    varchar(80) NOT NULL,
    location                geography(Point, 4326),   -- preenchido no módulo discovery
    pix_key                 varchar(140),
    deposit_deadline_hours  int NOT NULL DEFAULT 12 CHECK (deposit_deadline_hours BETWEEN 1 AND 72),
    created_at              timestamptz NOT NULL,
    updated_at              timestamptz NOT NULL
);
CREATE INDEX professional_location_idx ON professional USING gist(location);
CREATE INDEX professional_studio_trgm_idx ON professional USING gin (studio gin_trgm_ops);
