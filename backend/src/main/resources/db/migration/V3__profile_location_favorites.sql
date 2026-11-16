-- Localização da profissional: o app envia lat/lng; a coluna geography é gerada para busca por distância.
DROP INDEX IF EXISTS professional_location_idx;
ALTER TABLE professional DROP COLUMN location;
ALTER TABLE professional ADD COLUMN latitude  double precision CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE professional ADD COLUMN longitude double precision CHECK (longitude BETWEEN -180 AND 180);
ALTER TABLE professional ADD COLUMN location geography(Point, 4326)
    GENERATED ALWAYS AS (
        CASE WHEN latitude IS NULL OR longitude IS NULL THEN NULL
             ELSE ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography END
    ) STORED;
CREATE INDEX professional_location_idx ON professional USING gist(location);
CREATE INDEX professional_niche_idx ON professional(niche);

-- Favoritas da cliente ("carteira de profissionais")
CREATE TABLE favorite (
    client_account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    professional_id    uuid NOT NULL REFERENCES professional(id) ON DELETE CASCADE,
    created_at         timestamptz NOT NULL,
    PRIMARY KEY (client_account_id, professional_id)
);
