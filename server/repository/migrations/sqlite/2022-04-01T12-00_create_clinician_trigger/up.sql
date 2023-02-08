CREATE TRIGGER clinician_insert_trigger
  AFTER INSERT ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('clinician', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER clinician_update_trigger
  AFTER UPDATE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('clinician', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER clinician_delete_trigger
  AFTER DELETE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('clinician', OLD.id, 'DELETE');
  END;
