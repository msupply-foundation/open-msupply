-- Create transact table.
--
-- CREATE TABLE transact (
--   ID ALPHA PRIMARY KEY,
--   name_ID ALPHA,
--   invoice_number LONG INTEGER
--   type ALPHA
-- );
--
-- ID: unique id of the transaction.
-- name_ID: id of the customer or supplier associated with the transaction.
-- invoice_number: invoice number used to identify the transaction.
-- type: type of the transaction ('ci', 'cc', 'si', 'sc', 'sr', 'bu', 'rc', 'ps')

CREATE TYPE transact_type AS ENUM ('ci', 'si');

CREATE TABLE transact (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name_id VARCHAR(255) NOT NULL,
    invoice_number INTEGER NOT NULL,
    type_of transact_type NOT NULL
)