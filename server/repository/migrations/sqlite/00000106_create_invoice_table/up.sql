CREATE TABLE invoice (
    id text NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
    name_id text NOT NULL REFERENCES name(id),
    name_store_id text REFERENCES store (id),
    -- For outbound shipments, the id of the issuing store.
    -- For inbound shipments, the id of the receiving store.
    store_id text NOT NULL REFERENCES store (id),
    invoice_number integer NOT NULL,
    type TEXT CHECK (type IN ('OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT', 'INVENTORY_ADJUSTMENT')) NOT NULL,
    status text CHECK (status IN ('NEW','ALLOCATED', 'PICKED', 'SHIPPED',  'DELIVERED', 'VERIFIED')) NOT NULL,
    on_hold boolean NOT NULL,
    comment text,
    their_reference text,
    created_datetime text NOT NULL,
    allocated_datetime text,
    picked_datetime text,
    shipped_datetime text,
    delivered_datetime text,
    verified_datetime text,
    color text)
