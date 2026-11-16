-- Exclusão de conta: a profissional some da busca e da página pública
ALTER TABLE professional ADD COLUMN deleted_at timestamptz;

-- Conteúdo escondido por denúncias (até a revisão)
ALTER TABLE story  ADD COLUMN hidden_at timestamptz;
ALTER TABLE review ADD COLUMN hidden_at timestamptz;

-- Bloqueio entre contas: vale nos dois sentidos (nenhuma das duas vê nem agenda com a outra)
CREATE TABLE account_block (
    blocker_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    blocked_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    created_at          timestamptz NOT NULL,
    PRIMARY KEY (blocker_account_id, blocked_account_id),
    CHECK (blocker_account_id <> blocked_account_id)
);
CREATE INDEX account_block_blocked_idx ON account_block(blocked_account_id);

-- Denúncias (revisão em até 24h, exigência da App Store para conteúdo de usuárias)
CREATE TABLE report (
    id                   uuid PRIMARY KEY,
    reporter_account_id  uuid NOT NULL REFERENCES account(id),
    target_type          varchar(20) NOT NULL CHECK (target_type IN ('PROFESSIONAL','CLIENT','STORY','REVIEW','MESSAGE')),
    target_id            uuid NOT NULL,
    reason               varchar(20) NOT NULL CHECK (reason IN ('SPAM','INAPPROPRIATE','HARASSMENT','FAKE','OTHER')),
    details              varchar(500),
    status               varchar(12) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DISMISSED','ACTIONED')),
    created_at           timestamptz NOT NULL,
    reviewed_at          timestamptz,
    UNIQUE (reporter_account_id, target_type, target_id)
);
CREATE INDEX report_open_idx ON report(status, created_at);
CREATE INDEX report_target_idx ON report(target_type, target_id);
