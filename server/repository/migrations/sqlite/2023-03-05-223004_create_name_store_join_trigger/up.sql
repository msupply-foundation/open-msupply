CREATE TRIGGER name_store_join_insert_trigger
  AFTER INSERT ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
      VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
  END;

CREATE TRIGGER name_store_join_update_trigger
  AFTER UPDATE ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
      VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
  END;