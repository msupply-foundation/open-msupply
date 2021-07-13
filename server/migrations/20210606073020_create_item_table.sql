-- Create item table

CREATE TYPE item_type AS ENUM ('general', 'service', 'cross_reference');

CREATE TABLE item (
    id varchar(255) NOT NULL PRIMARY KEY,
    item_name varchar(255) NOT NULL,
    type_of item_type NOT NULL
)
