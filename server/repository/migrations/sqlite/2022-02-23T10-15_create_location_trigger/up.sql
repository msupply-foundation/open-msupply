CREATE TRIGGER location__insert_trigger
  AFTER INSERT ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER location__update_trigger
  AFTER UPDATE ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER location__delete_trigger
  AFTER DELETE ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', OLD.id, 'DELETE');
  END;
