-- Create requisition table.

CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    type_of TEXT CHECK(type_of IN (
        'imprest',
        'stock_history',
        'request',
        'response',
        'supply',
        'report')) NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id),
    FOREIGN KEY(store_id) REFERENCES store(id)
)
