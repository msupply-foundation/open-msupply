-- Create requisition table.
--
-- CREATE TABLE requisition (
--   ID ALPHA PRIMARY KEY,
--   name_ID ALPHA,
--   store_ID ALPHA
-- );
--
-- ID: unique id of the requisition.
-- name_ID: id of the customer associated with the requisition.
-- store_ID: id of the supplier associated with the requisition.

CREATE TABLE requisition (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name_id VARCHAR(255) NOT NULL,
    store_id VARCHAR(255) NOT NULL
)