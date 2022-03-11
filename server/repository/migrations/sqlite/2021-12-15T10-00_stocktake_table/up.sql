CREATE TABLE stocktake (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT NOT NULL,
    stocktake_number INTEGER NOT NULL,
    comment	TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('NEW', 'FINALISED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    stocktake_date TEXT,
    finalised_datetime TEXT,
    is_locked BOOLEAN,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)