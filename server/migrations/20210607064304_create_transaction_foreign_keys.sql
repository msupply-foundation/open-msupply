-- Create transaction foreign key constraints
BEGIN;
ALTER TABLE transaction ADD CONSTRAINT fk_name FOREIGN KEY(name_id) REFERENCES name(id);
COMMIT;