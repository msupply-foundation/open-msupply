-- Create requisition foreign key constraints
BEGIN;
ALTER TABLE requisition ADD CONSTRAINT fk_name FOREIGN KEY(name_id) REFERENCES name(id);
COMMIT;