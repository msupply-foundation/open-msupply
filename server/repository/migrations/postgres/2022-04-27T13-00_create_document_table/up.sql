CREATE TYPE document_status AS ENUM
(
    'ACTIVE',
    'DELETED'
);

CREATE TABLE document
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_ids TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    schema_id TEXT REFERENCES form_schema(id),
    status document_status NOT NULL,
    comment TEXT,
    patient_id TEXT REFERENCES name (id)
);

CREATE INDEX ix_document_name_unique ON document(name);

CREATE VIEW latest_document
AS
    SELECT d.*
    FROM (
      SELECT name, MAX(timestamp) AS timestamp
        FROM document
        GROUP BY name
) grouped
        INNER JOIN document d
        ON d.name = grouped.name AND d.timestamp = grouped.timestamp;