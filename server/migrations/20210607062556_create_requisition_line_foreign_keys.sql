-- Create requisition line foreign key constraints
BEGIN;
ALTER TABLE requisition_line ADD CONSTRAINT fk_requisition FOREIGN KEY(requisition_id) REFERENCES requisition(id);
ALTER TABLE requisition_line ADD CONSTRAINT fk_item FOREIGN KEY(item_id) REFERENCES item(id);
COMMIT;