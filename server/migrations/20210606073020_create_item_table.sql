-- Create item table.

CREATE TYPE item_type AS ENUM ('general', 'service', 'cross_reference');

CREATE TABLE item (
    -- Unique id assigned to each item.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Name of the item.
    item_name VARCHAR(255) NOT NULL,
    type_of item_type NOT NULL
)
