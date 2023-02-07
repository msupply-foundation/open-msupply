CREATE TRIGGER clinician_insert_trigger
  AFTER INSERT ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician', NEW.id, 'UPSERT', NEW.store_id);
  END;

CREATE TRIGGER clinician_update_trigger
  AFTER UPDATE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician', NEW.id, 'UPSERT', NEW.store_id);
  END;

CREATE TRIGGER clinician_delete_trigger
  AFTER DELETE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician', OLD.id, 'DELETE', OLD.store_id);
  END;
