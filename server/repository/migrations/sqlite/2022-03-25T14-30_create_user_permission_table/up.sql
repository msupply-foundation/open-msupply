CREATE TABLE user_permission (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_account(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    resource TEXT CHECK (resource IN ('STOCKTAKE', 'OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT', 'REQUISITION')) NOT NULL,
    permission TEXT CHECK (permission IN ('QUERY', 'MUTATE')) NOT NULL
)
