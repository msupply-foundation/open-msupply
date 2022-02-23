-- key value store, e.g. to store local server state
CREATE TABLE key_value_store (
    id TEXT NOT NULL PRIMARY KEY,
    value_string TEXT,
    value_int INTEGER,
    value_bigint BIGINT,
    value_float REAL,
    value_bool BOOLEAN
)