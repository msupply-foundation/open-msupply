-- Create transact table

CREATE TABLE transact (
    id TEXT NOT NULL PRIMARY KEY,
    -- For customer invoices, the id of the receiving customer
    -- For supplier invoices, the id of the sending supplier
    name_id TEXT NOT NULL,
    -- For customer invoices, the id of the issuing store
    -- For supplier invoices, the id of the receiving store
    store_id TEXT NOT NULL,
    invoice_number INTEGER NOT NULL,
    type_of TEXT CHECK(type_of IN (
        'customer_invoice',
        'customer_credit',
        'supplier_invoice',
        'supplier_credit',
        'repack',
        'build',
        'receipt',
        'payment')) NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id)
)
