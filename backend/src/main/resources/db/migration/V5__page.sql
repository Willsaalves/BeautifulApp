-- Página da profissional montada com blocos. "servicos" e "agenda" são fixos.
CREATE TABLE page_widget (
    id               uuid PRIMARY KEY,
    professional_id  uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    type             varchar(20) NOT NULL CHECK (type IN ('CAPA','GALERIA','PORCENTAGEM','CONTAGEM','TEXTO','TRENDING','FIDELIDADE','AVALIACOES','SERVICOS','AGENDA')),
    position         int NOT NULL,
    title            varchar(80),
    subtitle         varchar(160),
    color            varchar(9),
    image_key        varchar(255),
    images           text[] NOT NULL DEFAULT '{}',
    value            int CHECK (value BETWEEN 0 AND 100),
    target           timestamptz,
    body             varchar(1000)
);
CREATE INDEX page_widget_professional_idx ON page_widget(professional_id, position);
