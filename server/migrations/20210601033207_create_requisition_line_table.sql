-- Create requisition line table 
CREATE TABLE requisition_line (
    id TEXT NOT NULL,
    CONSTRAINT pk_requisition_line PRIMARY KEY(id),
    requisition_id TEXT NOT NULL,
    CONSTRAINT fk_requisition FOREIGN KEY(requisition_id) REFERENCES requisition(id),
    item_name TEXT NOT NULL,
    item_quantity REAL NOT NULL
)