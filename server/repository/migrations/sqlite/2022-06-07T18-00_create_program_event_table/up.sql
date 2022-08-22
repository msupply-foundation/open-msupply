CREATE TABLE program_event (
    id TEXT NOT NULL PRIMARY KEY,
    datetime TIMESTAMP NOT NULL,
    name_id TEXT,
    context TEXT NOT NULL,
    'group' TEXT,
    name TEXT,
    type TEXT NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id)
)