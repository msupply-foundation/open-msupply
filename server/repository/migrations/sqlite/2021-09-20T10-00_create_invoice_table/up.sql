CREATE TABLE invoice (
    id TEXT NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
    name_id TEXT NOT NULL REFERENCES name(id),
    name_store_id TEXT REFERENCES store (id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT,
    -- For outbound shipments, the id of the issuing store.
    -- For inbound shipments, the id of the receiving store.
    store_id TEXT NOT NULL REFERENCES store (id),
    invoice_number integer NOT NULL,
    type TEXT CHECK (type IN ('OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT', 'INVENTORY_ADJUSTMENT')) NOT NULL,
    status TEXT CHECK (status IN ('NEW','ALLOCATED', 'PICKED', 'SHIPPED',  'DELIVERED', 'VERIFIED')) NOT NULL,
    on_hold BOOLEAN NOT NULL,
    comment TEXT,
    their_reference TEXT,
    transport_reference TEXT,
    created_datetime TEXT NOT NULL,
    allocated_datetime TEXT,
    picked_datetime TEXT,
    shipped_datetime TEXT,
    delivered_datetime TEXT,
    verified_datetime TEXT,
    colour TEXT,
    requisition_id TEXT,
    linked_invoice_id TEXT
)
