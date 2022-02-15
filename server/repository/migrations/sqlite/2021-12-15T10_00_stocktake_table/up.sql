CREATE TABLE stocktake (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    stocktake_number INTEGER NOT NULL,
    comment	TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('NEW', 'FINALISED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    finalised_datetime TEXT,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)