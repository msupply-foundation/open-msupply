CREATE TABLE invoice (
    id TEXT NOT NULL PRIMARY KEY,
    -- For customer invoices, the id of the receiving customer.
    -- For supplier invoices, the id of the sending supplier.
    name_id TEXT NOT NULL REFERENCES name(id),
    -- For customer invoices, the id of the issuing store.
    -- For supplier invoices, the id of the receiving store.
    store_id TEXT NOT NULL REFERENCES store (id),
    invoice_number INTEGER NOT NULL,
    type TEXT CHECK (type IN ('CUSTOMER_INVOICE', 'SUPPLIER_INVOICE')) NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'CONFIRMED', 'FINALISED')) NOT NULL,
    comment TEXT,
    their_reference TEXT,
    entry_datetime TEXT NOT NULL,
    confirm_datetime TEXT,
    finalised_datetime TEXT
)
