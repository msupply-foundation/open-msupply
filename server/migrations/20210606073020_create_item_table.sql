-- Create item table 
CREATE TABLE item (
    id TEXT NOT NULL,
    CONSTRAINT pk_item PRIMARY KEY(id),
    item_name TEXT NOT NULL
)