-- Create transact table

CREATE TYPE transact_type AS ENUM (
    'customer_invoice',
    'customer_credit',
    'supplier_invoice',
    'supplier_credit',
    'repack',
    'build',
    'receipt',
    'payment'
);

CREATE TABLE transact (
    id varchar(255) NOT NULL PRIMARY KEY,
    -- For customer invoices, the id of the receiving customer
    -- For supplier invoices, the id of the sending supplier
    name_id varchar(255) NOT NULL,
    -- For customer invoices, the id of the issuing store
    -- For supplier invoices, the id of the receiving store
    store_id varchar(255) NOT NULL,
    invoice_number integer NOT NULL,
    type_of transact_type NOT NULL
)
