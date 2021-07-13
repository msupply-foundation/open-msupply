-- Create transact foreign key constraints

BEGIN;
ALTER TABLE transact ADD CONSTRAINT fk_name FOREIGN KEY(name_id) REFERENCES name(id);
COMMIT;
