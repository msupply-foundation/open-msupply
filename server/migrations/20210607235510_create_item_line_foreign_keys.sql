-- Create item_line foreign key constraints.

BEGIN;
ALTER TABLE item_line ADD CONSTRAINT fk_name FOREIGN KEY(item_id) REFERENCES item(id);
COMMIT;