-- Create requisition table.

CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_number BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    name_id TEXT NOT NULL REFERENCES name(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT,
    type TEXT CHECK (type IN ('REQUEST', 'RESPONSE')) NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'NEW', 'SENT', 'FINALISED')) NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    sent_datetime TIMESTAMP,
    finalised_datetime TIMESTAMP,
    colour TEXT,
    comment TEXT,
    their_reference TEXT,
    max_months_of_stock  DOUBLE PRECISION NOT NULL,
    min_months_of_stock DOUBLE PRECISION NOT NULL,
    linked_requisition_id TEXT
)
