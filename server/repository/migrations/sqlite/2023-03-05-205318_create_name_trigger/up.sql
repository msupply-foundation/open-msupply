CREATE TRIGGER name_insert_trigger
  AFTER INSERT ON name
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER name_update_trigger
  AFTER UPDATE ON name
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER name_delete_trigger
  AFTER DELETE ON name
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('name', OLD.id, 'DELETE');
  END;
