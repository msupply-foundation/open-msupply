-- Create store foreign key constraints.

BEGIN;
ALTER TABLE store ADD CONSTRAINT fk_name FOREIGN KEY(name_id) REFERENCES name(id);
COMMIT;
