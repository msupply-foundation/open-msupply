ALTER TABLE document RENAME COLUMN patient_id TO owner;
ALTER TABLE document ADD context TEXT;