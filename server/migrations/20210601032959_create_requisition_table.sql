-- Create requisition table

CREATE TYPE requisition_type AS ENUM ('imprest', 'stock_history',  'request', 'response', 'supply', 'report');

CREATE TABLE requisition (
    id varchar(255) NOT NULL PRIMARY KEY,
    name_id varchar(255) NOT NULL,
    store_id varchar(255) NOT NULL,
    type_of requisition_type NOT NULL
)
