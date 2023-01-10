CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    document_type TEXT NOT NULL,
    context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
)