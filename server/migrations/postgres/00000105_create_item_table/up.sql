-- Create item table.

CREATE TYPE item_type AS ENUM ('general', 'service', 'cross_reference', 'none_stock');

CREATE TABLE item (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    type_of item_type NOT NULL
)
