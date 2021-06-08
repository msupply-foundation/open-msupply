-- Create transact table.
--
-- CREATE TABLE transact (
--   ID ALPHA PRIMARY KEY,
--   name_ID ALPHA,
--   invoice_number LONG INTEGER
-- );

CREATE TABLE transact (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name_id VARCHAR(255) NOT NULL,
    invoice_number INTEGER NOT NULL
)