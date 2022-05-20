CREATE TYPE stocktake_status AS ENUM (
    'NEW',
    'FINALISED'
);

CREATE TABLE stocktake (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT NOT NULL,
    stocktake_number BIGINT NOT NULL,
    comment	TEXT,
    description TEXT,
    status stocktake_status NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    stocktake_date DATE,
    finalised_datetime TIMESTAMP,
    is_locked BOOLEAN,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)