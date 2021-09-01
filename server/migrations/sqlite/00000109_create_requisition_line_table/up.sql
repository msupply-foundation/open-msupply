-- Create requiosition_line table.

CREATE TABLE requisition_line (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    actual_quantity REAL NOT NULL,
    -- suggested_quantity is calculated based on historical usage patterns
    suggested_quantity REAL NOT NULL,
    FOREIGN KEY(requisition_id) REFERENCES requisition(id),
    FOREIGN KEY(item_id) REFERENCES item(id)
)
