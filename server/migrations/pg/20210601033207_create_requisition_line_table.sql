-- Create requisition line table

CREATE TABLE requisition_line (
    id varchar(255) NOT NULL PRIMARY KEY,
    requisition_id varchar(255) NOT NULL,
    item_id varchar(255) NOT NULL,
    actual_quantity DOUBLE PRECISION NOT NULL,
    -- suggested_quantity is calculated based on historical usage patterns
    suggested_quantity DOUBLE PRECISION NOT NULL
)
