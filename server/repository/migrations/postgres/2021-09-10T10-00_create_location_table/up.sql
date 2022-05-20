CREATE TABLE location (
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    on_hold BOOLEAN NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id)
);

