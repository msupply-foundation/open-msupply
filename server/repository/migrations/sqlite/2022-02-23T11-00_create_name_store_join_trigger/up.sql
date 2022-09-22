CREATE TRIGGER name_store_join_insert_trigger
  AFTER INSERT ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name_store_join', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER name_store_join_update_trigger
  AFTER UPDATE ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name_store_join', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER name_store_join_delete_trigger
  AFTER DELETE ON name_store_join
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name_store_join', OLD.id, 'DELETE');
  END;
