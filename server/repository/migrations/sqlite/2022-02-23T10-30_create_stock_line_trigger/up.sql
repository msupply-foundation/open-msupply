CREATE TRIGGER stock_line_insert_trigger
  AFTER INSERT ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stock_line_update_trigger
  AFTER UPDATE ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', NEW.id, 'UPSERT');
  END;

CREATE TRIGGER stock_line_delete_trigger
  AFTER DELETE ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', OLD.id, 'DELETE');
  END;
