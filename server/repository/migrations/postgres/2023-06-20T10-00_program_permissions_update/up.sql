DROP TABLE IF EXISTS document_registry CASCADE;
DROP TYPE IF EXISTS document_context CASCADE;

CREATE TYPE document_registry_type AS ENUM (
    'PATIENT',
    'PROGRAM_ENROLMENT',
    'ENCOUNTER',
    'CUSTOM'
);

CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    type document_registry_type NOT NULL,
    document_type TEXT NOT NULL,
    document_context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
);

ALTER TABLE program_event ADD document_context TEXT NOT NULL;