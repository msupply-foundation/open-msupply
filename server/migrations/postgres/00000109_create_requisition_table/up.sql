-- Create requisition table.

CREATE TYPE requisition_type AS ENUM ('imprest', 'stock_history',  'request', 'response', 'supply', 'report');

CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    type_of requisition_type NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id),
    FOREIGN KEY(store_id) REFERENCES store(id)
)
