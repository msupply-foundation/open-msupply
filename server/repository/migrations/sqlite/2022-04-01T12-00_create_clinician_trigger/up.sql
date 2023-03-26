CREATE TRIGGER clinician_insert_trigger
  AFTER INSERT ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;

CREATE TRIGGER clinician_update_trigger
  AFTER UPDATE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;

CREATE TRIGGER clinician_delete_trigger
  AFTER DELETE ON clinician
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('clinician', OLD.id, 'DELETE', OLD.is_sync_update);
  END;
