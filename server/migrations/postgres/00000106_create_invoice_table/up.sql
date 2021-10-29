CREATE TYPE invoice_type AS ENUM (
    'OUTBOUND_SHIPMENT',
    'INBOUND_SHIPMENT'
);

CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'FINALISED'
);

CREATE TABLE invoice (
    id text NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
    name_id text NOT NULL REFERENCES name(id),
    -- For outbound shipments, the id of the issuing store.
    -- For inbound shipments, the id of the receiving store.
    store_id text NOT NULL REFERENCES store (id),
    invoice_number integer NOT NULL,
    type invoice_type NOT NULL,
    status invoice_status NOT NULL,
    on_hold boolean NOT NULL,
    comment text,
    their_reference text,
    entry_datetime timestamp NOT NULL,
    confirm_datetime timestamp,
    finalised_datetime timestamp)
