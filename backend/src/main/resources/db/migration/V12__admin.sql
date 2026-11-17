-- Painel de administração

-- papel ADMIN (dado só pela lista APP_ADMIN_PHONES no login)
ALTER TABLE account_role DROP CONSTRAINT IF EXISTS account_role_role_check;
ALTER TABLE account_role ADD CONSTRAINT account_role_role_check CHECK (role IN ('CLIENT', 'PROFESSIONAL', 'ADMIN'));

-- suspensão pela moderação (login e tokens deixam de valer)
ALTER TABLE account ADD COLUMN suspended_at timestamptz;
ALTER TABLE account ADD COLUMN suspended_reason varchar(300);

-- quem decidiu cada denúncia
ALTER TABLE report ADD COLUMN reviewed_by uuid REFERENCES account(id);
ALTER TABLE report ADD COLUMN resolution_note varchar(500);

-- auditoria: toda ação de administrador fica registrada (LGPD / prestação de contas)
CREATE TABLE admin_action (
    id                uuid PRIMARY KEY,
    admin_account_id  uuid NOT NULL REFERENCES account(id),
    action            varchar(40) NOT NULL,
    target_type       varchar(20) NOT NULL,
    target_id         uuid NOT NULL,
    note              varchar(500),
    created_at        timestamptz NOT NULL
);
CREATE INDEX admin_action_created_idx ON admin_action(created_at DESC);
CREATE INDEX admin_action_target_idx ON admin_action(target_type, target_id);
