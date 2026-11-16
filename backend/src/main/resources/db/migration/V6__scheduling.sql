-- Expediente: um intervalo por dia da semana (0 = domingo). Sem linha = não atende nesse dia.
CREATE TABLE work_hours (
    professional_id  uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    weekday          smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time       time NOT NULL,
    end_time         time NOT NULL CHECK (end_time > start_time),
    PRIMARY KEY (professional_id, weekday)
);

-- Bloqueios (folga, almoço, compromisso)
CREATE TABLE time_block (
    id               uuid PRIMARY KEY,
    professional_id  uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    starts_at        timestamptz NOT NULL,
    ends_at          timestamptz NOT NULL CHECK (ends_at > starts_at),
    reason           varchar(80),
    created_at       timestamptz NOT NULL
);
CREATE INDEX time_block_pro_idx ON time_block(professional_id, starts_at);

CREATE TABLE appointment (
    id                   uuid PRIMARY KEY,
    client_account_id    uuid NOT NULL REFERENCES account(id),
    professional_id      uuid NOT NULL REFERENCES professional(id),
    service_id           uuid NOT NULL REFERENCES service(id),
    service_name         varchar(80) NOT NULL,      -- foto do serviço no momento do agendamento
    design_id            uuid REFERENCES design(id) ON DELETE SET NULL,
    design_name          varchar(40),
    starts_at            timestamptz NOT NULL,
    ends_at              timestamptz NOT NULL CHECK (ends_at > starts_at),
    period               tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
    status               varchar(20) NOT NULL CHECK (status IN
                           ('AWAITING_DEPOSIT','RECEIPT_SENT','CONFIRMED','ADJUSTMENT_PENDING','COMPLETED','CANCELLED','EXPIRED')),
    previous_status      varchar(20),               -- para voltar depois do ajuste de valor
    price_cents          bigint NOT NULL CHECK (price_cents >= 0),
    discount_cents       bigint NOT NULL DEFAULT 0,
    deposit_cents        bigint NOT NULL CHECK (deposit_cents >= 0),
    deposit_due_at       timestamptz,
    receipt_key          varchar(255),
    reference_key        varchar(255),
    notes                varchar(500),
    adj_new_price_cents  bigint,
    adj_note             varchar(200),
    adj_status           varchar(10) CHECK (adj_status IN ('PENDING','ACCEPTED','DECLINED')),
    cancelled_by         varchar(15),
    created_at           timestamptz NOT NULL,
    updated_at           timestamptz NOT NULL,
    version              int NOT NULL DEFAULT 0,
    -- Nunca dois agendamentos ativos se sobrepondo para a mesma profissional (vale até com pedidos simultâneos)
    CONSTRAINT appointment_no_overlap EXCLUDE USING gist (professional_id WITH =, period WITH &&)
        WHERE (status IN ('AWAITING_DEPOSIT','RECEIPT_SENT','CONFIRMED','ADJUSTMENT_PENDING'))
);
CREATE INDEX appointment_pro_start_idx ON appointment(professional_id, starts_at);
CREATE INDEX appointment_client_start_idx ON appointment(client_account_id, starts_at DESC);
CREATE INDEX appointment_deposit_due_idx ON appointment(deposit_due_at) WHERE status = 'AWAITING_DEPOSIT';

-- Escolhas feitas no agendamento (com os rótulos e preços da época)
CREATE TABLE appointment_selection (
    appointment_id     uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
    option_id          uuid NOT NULL,
    choice_id          uuid NOT NULL,
    option_label       varchar(40) NOT NULL,
    choice_label       varchar(40) NOT NULL,
    price_delta_cents  bigint NOT NULL,
    PRIMARY KEY (appointment_id, option_id)
);
