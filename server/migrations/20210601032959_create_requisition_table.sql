-- Create requisition table.

CREATE TYPE requisition_type AS ENUM ('imprest', 'stock_history',  'request', 'response', 'supply', 'report');

CREATE TABLE requisition (
    -- Unique id assigned to each requisition.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the customer associated with the requisition.
    name_id VARCHAR(255) NOT NULL,
    -- Id of the supplier associated with the requisition.
    store_id VARCHAR(255) NOT NULL,
    -- Type of the requisition.
    type_of requisition_type NOT NULL
)