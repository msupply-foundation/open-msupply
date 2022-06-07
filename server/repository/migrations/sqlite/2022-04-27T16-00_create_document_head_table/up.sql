CREATE TABLE document_head (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    head TEXT NOT NULL REFERENCES document(id)
)