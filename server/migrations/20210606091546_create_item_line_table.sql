-- Create item_line table

CREATE TABLE item_line (
    id varchar(255) NOT NULL PRIMARY KEY,
    item_id varchar(255) NOT NULL,
    store_id varchar(255) NOT NULL,
    batch text NOT NULL,
    quantity DOUBLE PRECISION NOT NULL
)
