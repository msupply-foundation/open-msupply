CREATE TRIGGER clinician_store_join_insert_trigger
  AFTER INSERT ON clinician_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id);
  END;

CREATE TRIGGER clinician_store_join_update_trigger
  AFTER UPDATE ON clinician_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id);
  END;

CREATE TRIGGER clinician_store_join_delete_trigger
  AFTER DELETE ON clinician_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('clinician_store_join', OLD.id, 'DELETE', OLD.store_id);
  END;