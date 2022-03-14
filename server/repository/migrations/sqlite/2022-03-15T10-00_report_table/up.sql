CREATE TABLE report (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type CHECK (type IN ('PPRO', 'GREP', 'OM_REPORT')) NOT NULL,
    data TEXT NOT NULL
)