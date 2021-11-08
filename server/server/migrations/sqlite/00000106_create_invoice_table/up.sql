CREATE TABLE invoice (
    id text NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
    name_id text NOT NULL REFERENCES name(id),
    -- For outbound shipments, the id of the issuing store.
    -- For inbound shipments, the id of the receiving store.
    store_id text NOT NULL REFERENCES store (id),
    invoice_number integer NOT NULL,
    type TEXT CHECK (type IN ('OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT')) NOT NULL,
    status text CHECK (status IN ('DRAFT', 'CONFIRMED', 'FINALISED')) NOT NULL,
    on_hold boolean NOT NULL,
    comment text,
    their_reference text,
    entry_datetime text NOT NULL,
    confirm_datetime text,
    finalised_datetime text)
