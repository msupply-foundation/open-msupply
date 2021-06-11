-- Create transaction table.

CREATE TYPE transaction_type AS ENUM (
    'customer_invoice', 
    'customer_credit', 
    'supplier_invoice', 
    'supplier_credit',
    'repack',
    'build', 
    'receipt',
    'payment'
);

CREATE TABLE transaction (
    -- Unique id assigned to each transaction.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the customer or supplier associated with the transaction.
    name_id VARCHAR(255) NOT NULL,
    -- Invoice number assigned to the transaction.
    invoice_number INTEGER NOT NULL,
    -- Type of the transaction.
    type_of transaction_type NOT NULL
)