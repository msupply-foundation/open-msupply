CREATE TRIGGER number_insert_trigger
  AFTER INSERT ON number
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('number', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER number_update_trigger
  AFTER UPDATE ON number
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('number', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER number_delete_trigger
  AFTER DELETE ON number
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('number', OLD.id, 'DELETE');
  END;
