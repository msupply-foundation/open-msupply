-- Create requisition line table.
--
-- CREATE TABLE requisition_line (
--   ID ALPHA PRIMARY KEY,
--   requisition_ID ALPHA,
--   item_ID ALPHA,
--   actualQuan REAL,
--   suggested_quantity REAL
-- );
--
-- ID: unique id of the requisition_line.
-- requisition_ID: id of the parent requisition.
-- item_ID: id of the item associated with the requisition_line.
-- actualQuan: requested quantity of item.
-- suggested_quantity: calculated suggested quantity of item.

CREATE TABLE requisition_line (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    requisition_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    actual_quantity DOUBLE PRECISION NOT NULL,
    suggested_quantity DOUBLE PRECISION NOT NULL, 
)