CREATE TYPE document_context AS ENUM (
    'PATIENT',
    'PROGRAM',
    'ENCOUNTER',
    'CUSTOM'
);

CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    document_type TEXT NOT NULL,
    context document_context NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
)