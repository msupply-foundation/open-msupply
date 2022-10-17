CREATE TABLE activity_log (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    store_id TEXT REFERENCES store(id),
    record_id TEXT,
    datetime TIMESTAMP NOT NULL
)