CREATE TABLE document (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    parents TEXT NOT NULL,
    author TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    schema_id TEXT REFERENCES json_schema(id)
)