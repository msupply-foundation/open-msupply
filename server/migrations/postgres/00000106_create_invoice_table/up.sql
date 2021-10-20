CREATE TYPE invoice_type AS ENUM (
    'CUSTOMER_INVOICE',
    'SUPPLIER_INVOICE'
);

CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'FINALISED'
);

CREATE TABLE invoice (
    id TEXT NOT NULL PRIMARY KEY,
    -- For customer invoices, the id of the receiving customer.
    -- For supplier invoices, the id of the sending supplier.
    name_id TEXT NOT NULL REFERENCES name(id),
    -- For customer invoices, the id of the issuing store.
    -- For supplier invoices, the id of the receiving store.
    store_id TEXT NOT NULL REFERENCES store (id),
    invoice_number INTEGER NOT NULL,
    type invoice_type NOT NULL,
    status invoice_status NOT NULL,
    comment TEXT,
    their_reference TEXT,
    entry_datetime TIMESTAMP NOT NULL,
    confirm_datetime TIMESTAMP,
    finalised_datetime TIMESTAMP)
