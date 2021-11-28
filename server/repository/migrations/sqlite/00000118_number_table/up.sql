-- Numbering table holding a list of named counters
CREATE TABLE number (
    -- unique key in the format: `${name}_${store_id}_${table}` (if store_id and table are given)
    id TEXT NOT NULL PRIMARY KEY,
    -- current counter value
    value BIGINT NOT NULL
)