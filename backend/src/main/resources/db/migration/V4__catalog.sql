CREATE TABLE service (
    id                    uuid PRIMARY KEY,
    professional_id       uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    name                  varchar(80) NOT NULL,
    niche                 varchar(20) NOT NULL,
    duration_min          int NOT NULL CHECK (duration_min BETWEEN 5 AND 600),
    price_cents           bigint NOT NULL CHECK (price_cents >= 0),
    deposit_percent       int NOT NULL CHECK (deposit_percent BETWEEN 0 AND 100),
    return_interval_days  int NOT NULL CHECK (return_interval_days BETWEEN 0 AND 730),
    requires_reference    boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    position              int NOT NULL DEFAULT 0,
    created_at            timestamptz NOT NULL,
    updated_at            timestamptz NOT NULL
);
CREATE INDEX service_professional_idx ON service(professional_id) WHERE active;
CREATE INDEX service_niche_idx ON service(niche) WHERE active;

-- Opções do serviço (Formato, Tamanho, Decoração…) e suas escolhas com acréscimo de preço
CREATE TABLE service_option (
    id          uuid PRIMARY KEY,
    service_id  uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
    label       varchar(40) NOT NULL,
    position    int NOT NULL
);
CREATE TABLE service_choice (
    id                 uuid PRIMARY KEY,
    option_id          uuid NOT NULL REFERENCES service_option(id) ON DELETE CASCADE,
    label              varchar(40) NOT NULL,
    price_delta_cents  bigint NOT NULL DEFAULT 0,
    position           int NOT NULL
);

-- Trending Designs: nome livre (PINK, MEGA…) + foto + acréscimo
CREATE TABLE design (
    id                 uuid PRIMARY KEY,
    professional_id    uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    service_id         uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
    name               varchar(40) NOT NULL,
    image_key          varchar(255) NOT NULL,
    price_delta_cents  bigint NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
    position           int NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL
);
CREATE INDEX design_professional_idx ON design(professional_id);
CREATE INDEX design_created_idx ON design(created_at DESC);
