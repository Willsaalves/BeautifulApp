-- ---------- Stories (24h) ----------
CREATE TABLE story (
    id                 uuid PRIMARY KEY,
    author_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    author_type        varchar(12) NOT NULL CHECK (author_type IN ('CLIENT','PROFESSIONAL')),
    professional_id    uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,   -- profissional marcada
    service_name       varchar(80),
    image_key          varchar(255) NOT NULL,
    caption            varchar(200),
    created_at         timestamptz NOT NULL,
    expires_at         timestamptz NOT NULL
);
CREATE INDEX story_active_idx ON story(expires_at DESC);
CREATE INDEX story_professional_idx ON story(professional_id, expires_at DESC);

-- ---------- Chat por agendamento ----------
CREATE TABLE chat_message (
    id                 uuid PRIMARY KEY,
    appointment_id     uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
    sender_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    sender_role        varchar(12) NOT NULL CHECK (sender_role IN ('CLIENT','PROFESSIONAL')),
    text               varchar(1000) NOT NULL,
    created_at         timestamptz NOT NULL
);
CREATE INDEX chat_message_appointment_idx ON chat_message(appointment_id, created_at);

-- ---------- Notificações ----------
CREATE TABLE device (
    id               uuid PRIMARY KEY,
    account_id       uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    expo_push_token  varchar(200) NOT NULL UNIQUE,
    platform         varchar(10),
    created_at       timestamptz NOT NULL,
    last_seen_at     timestamptz NOT NULL
);
CREATE INDEX device_account_idx ON device(account_id);

CREATE TABLE notification (
    id              uuid PRIMARY KEY,
    account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    kind            varchar(30) NOT NULL,
    title           varchar(80) NOT NULL,
    body            varchar(240) NOT NULL,
    appointment_id  uuid,
    created_at      timestamptz NOT NULL,
    read_at         timestamptz
);
CREATE INDEX notification_account_idx ON notification(account_id, created_at DESC);

-- lembrete de sinal vencendo é enviado uma vez
ALTER TABLE appointment ADD COLUMN deposit_reminded_at timestamptz;

-- ---------- "Seus próximos procedimentos" ----------
CREATE TABLE next_procedure (
    id                 uuid PRIMARY KEY,
    client_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    niche              varchar(20) NOT NULL,
    label              varchar(80) NOT NULL,
    target_date        date NOT NULL,
    done               boolean NOT NULL DEFAULT false,
    position           int NOT NULL DEFAULT 0
);
CREATE INDEX next_procedure_client_idx ON next_procedure(client_account_id, position);
