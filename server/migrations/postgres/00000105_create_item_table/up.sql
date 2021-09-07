-- Create item table.

CREATE TYPE item_type AS ENUM ('general', 'service', 'cross_reference');

CREATE TABLE item (
    id TEXT NOT NULL PRIMARY KEY,
    item_name TEXT NOT NULL,
    type_of item_type NOT NULL
)
