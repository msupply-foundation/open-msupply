-- Create requisition line table 
CREATE TABLE requisition_line (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_quantity REAL NOT NULL
)