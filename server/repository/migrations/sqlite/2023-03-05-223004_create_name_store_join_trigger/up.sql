CREATE TRIGGER name_store_join_insert_trigger
  AFTER INSERT ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id);
  END;

CREATE TRIGGER name_store_join_update_trigger
  AFTER UPDATE ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id);
  END;