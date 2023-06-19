DROP TABLE IF EXISTS document_registry;

CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
);