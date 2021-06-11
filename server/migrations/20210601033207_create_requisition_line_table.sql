-- Create requisition line table.

CREATE TABLE requisition_line (
    -- Unique id assigned to each transaction.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the parent requisition.
    requisition_id VARCHAR(255) NOT NULL,
    -- Id of the item associated with the requisition_line.
    item_id VARCHAR(255) NOT NULL,
    -- Requested quantity of item.
    actual_quantity DOUBLE PRECISION NOT NULL,
    -- Calculated suggested quantity of item (based on historical usage patterns).
    suggested_quantity DOUBLE PRECISION NOT NULL
)