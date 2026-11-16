-- ---------- Estoque ----------
CREATE TABLE product (
    id               uuid PRIMARY KEY,
    professional_id  uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    name             varchar(80) NOT NULL,
    unit             varchar(3) NOT NULL CHECK (unit IN ('UN','ML','G')),
    quantity         numeric(14,3) NOT NULL DEFAULT 0,
    min_quantity     numeric(14,3) NOT NULL DEFAULT 0,
    avg_cost_cents   numeric(14,4),                       -- custo médio ponderado por unidade
    lot              varchar(40),
    expires_at       date,
    active           boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL
);
CREATE INDEX product_professional_idx ON product(professional_id) WHERE active;

-- Livro-razão: toda entrada/saída vira uma linha
CREATE TABLE stock_movement (
    id               uuid PRIMARY KEY,
    product_id       uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    delta            numeric(14,3) NOT NULL,
    reason           varchar(12) NOT NULL CHECK (reason IN ('PURCHASE','ATTENDANCE','ADJUSTMENT')),
    unit_cost_cents  numeric(14,4),                       -- compra: custo pago; atendimento: custo médio do momento
    appointment_id   uuid,
    note             varchar(120),
    created_at       timestamptz NOT NULL
);
CREATE INDEX stock_movement_product_idx ON stock_movement(product_id, created_at DESC);
-- baixa de um atendimento acontece uma única vez por produto
CREATE UNIQUE INDEX stock_movement_attendance_uq ON stock_movement(product_id, appointment_id) WHERE reason = 'ATTENDANCE';

-- O que cada serviço consome por atendimento
CREATE TABLE service_consumption (
    service_id  uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
    product_id  uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    amount      numeric(14,3) NOT NULL CHECK (amount > 0),
    PRIMARY KEY (service_id, product_id)
);

-- ---------- Fidelidade ----------
CREATE TABLE loyalty_program (
    professional_id   uuid PRIMARY KEY REFERENCES professional(id) ON DELETE CASCADE,
    enabled           boolean NOT NULL DEFAULT false,
    goal_cents        bigint NOT NULL CHECK (goal_cents > 0),
    discount_percent  int NOT NULL CHECK (discount_percent BETWEEN 1 AND 100)
);

-- Quanto a cliente já gastou com a profissional e quantas metas já foram premiadas
CREATE TABLE loyalty_balance (
    client_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    professional_id    uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    spent_cents        bigint NOT NULL DEFAULT 0,
    cycles_rewarded    int NOT NULL DEFAULT 0,
    PRIMARY KEY (client_account_id, professional_id)
);

CREATE TABLE voucher (
    id                   uuid PRIMARY KEY,
    client_account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    professional_id      uuid REFERENCES professional(id) ON DELETE CASCADE,  -- NULL = voucher do app (vale com qualquer profissional)
    kind                 varchar(10) NOT NULL CHECK (kind IN ('LOYALTY','FEEDBACK')),
    percent              int NOT NULL CHECK (percent BETWEEN 1 AND 100),
    label                varchar(80) NOT NULL,
    cycle                int,
    year_month           varchar(7),
    used_appointment_id  uuid,
    used_at              timestamptz,
    created_at           timestamptz NOT NULL
);
CREATE INDEX voucher_client_idx ON voucher(client_account_id);
CREATE UNIQUE INDEX voucher_loyalty_uq  ON voucher(client_account_id, professional_id, cycle) WHERE kind = 'LOYALTY';
CREATE UNIQUE INDEX voucher_feedback_uq ON voucher(client_account_id, year_month) WHERE kind = 'FEEDBACK';

-- ---------- Avaliações ----------
CREATE TABLE review (
    id                 uuid PRIMARY KEY,
    appointment_id     uuid NOT NULL UNIQUE REFERENCES appointment(id) ON DELETE CASCADE,
    client_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    professional_id    uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    rating             int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment            varchar(500),
    created_at         timestamptz NOT NULL
);
CREATE INDEX review_professional_idx ON review(professional_id, created_at DESC);
