-- Create item table.

CREATE TABLE item (
    id TEXT NOT NULL PRIMARY KEY,
    item_name TEXT NOT NULL,
    type_of TEXT CHECK(type_of IN ('general', 'service', 'cross_reference')) NOT NULL
)
