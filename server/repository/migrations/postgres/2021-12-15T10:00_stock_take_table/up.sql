CREATE TYPE stock_take_status AS ENUM (
    'NEW',
    'FINALISED'
);

CREATE TABLE stock_take (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    stock_take_number BIGINT NOT NULL,
    comment	TEXT,
    description TEXT,
    status stock_take_status NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    finalised_datetime TIMESTAMP,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)