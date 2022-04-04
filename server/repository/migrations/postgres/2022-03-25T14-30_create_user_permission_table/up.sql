CREATE TYPE resource_type AS ENUM (
    'STOCKTAKE', 'OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT', 'REQUISITION'
);

CREATE TYPE permission_type AS ENUM (
    'QUERY', 'MUTATE'
);

CREATE TABLE user_permission (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_account(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    resource resource_type NOT NULL,
    permission permission_type NOT NULL
)
