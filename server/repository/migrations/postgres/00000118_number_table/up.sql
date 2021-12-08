-- Numbering table holding a list of named counters
CREATE TABLE number (
    -- unique key in the format: `${name}_${store_id}`
    id TEXT NOT NULL PRIMARY KEY,
    -- current counter value
    value BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id)
)