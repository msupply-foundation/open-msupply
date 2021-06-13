-- Create transact table.

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
    -- Unique id assigned to each transact.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the customer or supplier associated with the transact.
    name_id VARCHAR(255) NOT NULL,
    -- Invoice number assigned to the transact.
    invoice_number INTEGER NOT NULL,
    -- Type of the transact.
    type_of transact_type NOT NULL
)