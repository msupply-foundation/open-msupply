CREATE TRIGGER name_insert_trigger
  AFTER INSERT ON name
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;

CREATE TRIGGER name_update_trigger
  AFTER UPDATE ON name
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
      VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
  END;