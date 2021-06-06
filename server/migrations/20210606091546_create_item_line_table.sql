-- Create item_line table 
CREATE TABLE item_line (
    id TEXT NOT NULL,
    CONSTRAINT pk_item_line PRIMARY KEY(id),
    item_id TEXT NOT NULL,
    CONSTRAINT fk_item FOREIGN KEY(item_id) REFERENCES item(id),
    batch TEXT NOT NULL,
    quantity REAL NOT NULL
)